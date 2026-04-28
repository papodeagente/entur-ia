import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Provider, getModel } from './models';
import { getApiKey } from './settings';

export interface Attachment {
  kind: 'image' | 'pdf' | 'text';
  mimeType: string;
  // base64 (no data: prefix) OR text content
  data: string;
  name?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
}

export interface ToolFlags {
  webSearch?: boolean;
  codeExec?: boolean;
  thinking?: boolean;
}

export interface StreamArgs {
  model: string;
  messages: ChatMessage[];
  apiKey: string;
  tools?: ToolFlags;
}

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'image'; mimeType: string; b64: string; alt?: string }
  | { type: 'citation'; url: string; title?: string; snippet?: string }
  | { type: 'tool_start'; tool: string; input?: unknown }
  | { type: 'tool_result'; tool: string; output?: string };

export class MissingKeyError extends Error {
  provider: Provider;
  constructor(provider: Provider) {
    super(
      `Chave de API do provider "${provider}" não configurada. Acesse Configurações e cadastre a chave.`
    );
    this.provider = provider;
  }
}

export function humanizeProviderError(err: unknown, provider: Provider, modelId: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (provider === 'gemini') {
    if (lower.includes('429') || lower.includes('quota') || lower.includes('rate limit')) {
      if (modelId === 'gemini-2.5-pro' || modelId === 'imagen-3.0-generate-002') {
        return `O modelo "${modelId}" exige uma conta Google AI com billing ativo. Sua chave atual está no free tier (limit: 0 para esse modelo).\n\nO que fazer:\n  1) Trocar para um modelo do free tier: Gemini 2.5 Flash, 2.0 Flash, 1.5 Pro ou 1.5 Flash.\n  2) Ou ativar billing em https://aistudio.google.com/apikey > Set up billing.`;
      }
      return `Quota do Gemini estourada. Aguarde alguns segundos e tente de novo, ou troque para outro modelo (ex: Gemini 1.5 Flash) ou ative billing em https://aistudio.google.com/apikey.`;
    }
    if (lower.includes('401') || lower.includes('api key') || lower.includes('unauthenticated')) {
      return 'Chave do Google Gemini inválida ou sem permissão. Cadastre uma chave válida em Configurações > Chaves de API.';
    }
    if (lower.includes('safety') || lower.includes('blocked')) {
      return 'O Gemini bloqueou a resposta por filtro de segurança. Reformule a pergunta ou troque de modelo.';
    }
  }

  if (provider === 'openai') {
    if (lower.includes('429') || lower.includes('insufficient_quota')) {
      return 'Quota da OpenAI estourada ou sem créditos. Verifique billing em https://platform.openai.com/account/billing.';
    }
    if (lower.includes('401') || lower.includes('invalid_api_key')) {
      return 'Chave da OpenAI inválida. Cadastre uma chave válida em Configurações > Chaves de API.';
    }
    if (lower.includes('model_not_found') || lower.includes('does not exist')) {
      return `Modelo "${modelId}" indisponível na sua conta OpenAI (pode exigir tier mais alto). Tente GPT-4o ou GPT-4o mini.`;
    }
    if (lower.includes('content_policy') || lower.includes('safety')) {
      return 'OpenAI bloqueou a resposta por política de conteúdo. Reformule a pergunta.';
    }
  }

  if (provider === 'anthropic') {
    if (lower.includes('429') || lower.includes('rate_limit')) {
      return 'Quota da Anthropic estourada. Aguarde alguns segundos ou verifique limits em https://console.anthropic.com/settings/limits.';
    }
    if (lower.includes('401') || lower.includes('authentication')) {
      return 'Chave da Anthropic inválida. Cadastre uma chave válida em Configurações > Chaves de API.';
    }
    if (lower.includes('not_found_error') || lower.includes("doesn't exist")) {
      return `Modelo "${modelId}" não encontrado na conta Anthropic. Tente Claude Sonnet 4.6 ou Haiku 4.5.`;
    }
  }

  return raw.length > 800 ? raw.slice(0, 800) + '...' : raw;
}

// ============== OpenAI - Chat ==============
export async function* streamOpenAI({
  model,
  messages,
  apiKey,
}: StreamArgs): AsyncGenerator<StreamEvent> {
  const client = new OpenAI({ apiKey });
  const isReasoning = model.startsWith('o3') || model.startsWith('o4');

  const oaiMessages = messages.map((m) => {
    if (!m.attachments?.length || m.role !== 'user') {
      return { role: m.role, content: m.content };
    }
    const parts: any[] = [{ type: 'text', text: m.content || '' }];
    for (const a of m.attachments) {
      if (a.kind === 'image') {
        parts.push({
          type: 'image_url',
          image_url: { url: `data:${a.mimeType};base64,${a.data}` },
        });
      } else if (a.kind === 'pdf') {
        parts.push({
          type: 'file',
          file: { filename: a.name || 'doc.pdf', file_data: `data:${a.mimeType};base64,${a.data}` },
        });
      } else if (a.kind === 'text') {
        parts.push({ type: 'text', text: `--- Arquivo ${a.name || 'anexo'} ---\n${a.data}` });
      }
    }
    return { role: 'user', content: parts };
  });

  const stream = await client.chat.completions.create({
    model,
    messages: oaiMessages as any,
    stream: true,
    ...(isReasoning ? { reasoning_effort: 'medium' as any } : {}),
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield { type: 'delta', text: delta };
  }
}

// ============== OpenAI - Image generation/edit ==============
export async function generateOpenAIImage({
  model,
  prompt,
  apiKey,
  imageBase64,
  imageMime,
}: {
  model: string;
  prompt: string;
  apiKey: string;
  imageBase64?: string;
  imageMime?: string;
}): Promise<{ b64: string; mimeType: string }> {
  const client = new OpenAI({ apiKey });
  if (imageBase64) {
    // edit mode (gpt-image-1 only)
    const buffer = Buffer.from(imageBase64, 'base64');
    const file = await OpenAI.toFile(buffer, 'input.png', { type: imageMime || 'image/png' });
    const result = await client.images.edit({
      model: 'gpt-image-1',
      image: file,
      prompt,
      size: '1024x1024',
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error('OpenAI não retornou imagem editada');
    return { b64, mimeType: 'image/png' };
  }

  const params: any = {
    model,
    prompt,
    size: '1024x1024',
    n: 1,
  };
  if (model === 'gpt-image-1') {
    params.quality = 'high';
  } else if (model === 'dall-e-3') {
    params.quality = 'hd';
    params.response_format = 'b64_json';
  }

  const result = await client.images.generate(params);
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI não retornou imagem (b64)');
  return { b64, mimeType: 'image/png' };
}

// ============== Anthropic ==============
export async function* streamAnthropic({
  model,
  messages,
  apiKey,
  tools,
}: StreamArgs): AsyncGenerator<StreamEvent> {
  const client = new Anthropic({ apiKey });
  const system = messages.find((m) => m.role === 'system')?.content;
  const conv = messages.filter((m) => m.role !== 'system');

  const anthroMessages: any[] = conv.map((m) => {
    if (!m.attachments?.length || m.role !== 'user') {
      return { role: m.role, content: m.content };
    }
    const blocks: any[] = [];
    for (const a of m.attachments) {
      if (a.kind === 'image') {
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: a.mimeType, data: a.data },
        });
      } else if (a.kind === 'pdf') {
        blocks.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: a.data },
        });
      } else if (a.kind === 'text') {
        blocks.push({ type: 'text', text: `--- ${a.name || 'arquivo'} ---\n${a.data}` });
      }
    }
    if (m.content) blocks.push({ type: 'text', text: m.content });
    return { role: m.role, content: blocks };
  });

  const apiTools: any[] = [];
  if (tools?.webSearch) {
    apiTools.push({ type: 'web_search_20250305', name: 'web_search', max_uses: 5 });
  }
  if (tools?.codeExec) {
    apiTools.push({ type: 'code_execution_20250522', name: 'code_execution' });
  }

  const params: any = {
    model,
    max_tokens: 8192,
    system,
    messages: anthroMessages,
  };
  if (apiTools.length) params.tools = apiTools;
  if (tools?.thinking) {
    params.thinking = { type: 'enabled', budget_tokens: 5000 };
    params.max_tokens = 16000;
  }

  const stream = await client.messages.stream(params);
  let currentBlockType: string | null = null;

  for await (const event of stream) {
    if (event.type === 'content_block_start') {
      currentBlockType = (event.content_block as any).type;
      if (currentBlockType === 'tool_use' || currentBlockType === 'server_tool_use') {
        const name = (event.content_block as any).name;
        yield { type: 'tool_start', tool: name };
      }
    } else if (event.type === 'content_block_delta') {
      const delta: any = event.delta;
      if (delta.type === 'text_delta') {
        yield { type: 'delta', text: delta.text };
      } else if (delta.type === 'thinking_delta') {
        yield { type: 'thinking', text: delta.thinking };
      }
    } else if (event.type === 'content_block_stop') {
      currentBlockType = null;
    }
  }

  // After streaming, fetch final message to extract citations from web_search results
  const final = await stream.finalMessage();
  for (const block of final.content) {
    if ((block as any).type === 'web_search_tool_result') {
      const results = (block as any).content;
      if (Array.isArray(results)) {
        for (const r of results) {
          if (r.type === 'web_search_result') {
            yield { type: 'citation', url: r.url, title: r.title };
          }
        }
      }
    }
  }
}

// ============== Gemini ==============
export async function* streamGemini({
  model,
  messages,
  apiKey,
  tools,
}: StreamArgs): AsyncGenerator<StreamEvent> {
  const client = new GoogleGenerativeAI(apiKey);
  const systemMsg = messages.find((m) => m.role === 'system')?.content;
  const conv = messages.filter((m) => m.role !== 'system');

  const lastUser = conv[conv.length - 1];
  if (!lastUser || lastUser.role !== 'user') {
    throw new Error('Última mensagem deve ser do usuário');
  }

  const toGemParts = (msg: ChatMessage): any[] => {
    const parts: any[] = [];
    if (msg.attachments?.length) {
      for (const a of msg.attachments) {
        parts.push({
          inlineData: { mimeType: a.mimeType, data: a.data },
        });
      }
    }
    if (msg.content) parts.push({ text: msg.content });
    return parts;
  };

  const history = conv.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: toGemParts(m),
  }));

  const apiTools: any[] = [];
  if (tools?.webSearch) {
    apiTools.push({ googleSearch: {} });
  }
  if (tools?.codeExec) {
    apiTools.push({ codeExecution: {} });
  }

  const generative = client.getGenerativeModel({
    model,
    systemInstruction: systemMsg,
    ...(apiTools.length ? { tools: apiTools } : {}),
  } as any);

  const chat = generative.startChat({ history });
  const result = await chat.sendMessageStream(toGemParts(lastUser));

  let lastResponse: any = null;
  for await (const chunk of result.stream) {
    lastResponse = chunk;
    const text = chunk.text();
    if (text) yield { type: 'delta', text };
    const cand = chunk.candidates?.[0];
    const parts = cand?.content?.parts;
    if (parts) {
      for (const p of parts) {
        if ((p as any).inlineData) {
          const d = (p as any).inlineData;
          yield { type: 'image', mimeType: d.mimeType || 'image/png', b64: d.data };
        }
        if ((p as any).executableCode) {
          yield {
            type: 'tool_start',
            tool: 'code_execution',
            input: (p as any).executableCode.code,
          };
        }
        if ((p as any).codeExecutionResult) {
          yield {
            type: 'tool_result',
            tool: 'code_execution',
            output: (p as any).codeExecutionResult.output,
          };
        }
      }
    }
  }

  // Citations from grounding metadata
  try {
    const final = await result.response;
    const grounding = (final as any).candidates?.[0]?.groundingMetadata;
    if (grounding?.groundingChunks) {
      for (const c of grounding.groundingChunks) {
        if (c.web?.uri) {
          yield { type: 'citation', url: c.web.uri, title: c.web.title };
        }
      }
    }
  } catch {}
}

// ============== Imagen 3 (Gemini) ==============
export async function generateImagen({
  prompt,
  apiKey,
}: {
  prompt: string;
  apiKey: string;
}): Promise<{ b64: string; mimeType: string }> {
  // Imagen requires a different endpoint; using REST directly
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(
    apiKey
  )}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '1:1', safetyFilterLevel: 'block_some' },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Imagen API erro ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const pred = data?.predictions?.[0];
  const b64 = pred?.bytesBase64Encoded;
  if (!b64) throw new Error('Imagen não retornou imagem');
  return { b64, mimeType: pred.mimeType || 'image/png' };
}

// ============== Dispatcher ==============
export async function* streamFromProvider(
  provider: Provider,
  args: Omit<StreamArgs, 'apiKey'>
): AsyncGenerator<StreamEvent> {
  const apiKey = await getApiKey(provider);
  if (!apiKey) throw new MissingKeyError(provider);
  const fullArgs: StreamArgs = { ...args, apiKey };
  if (provider === 'openai') yield* streamOpenAI(fullArgs);
  else if (provider === 'anthropic') yield* streamAnthropic(fullArgs);
  else if (provider === 'gemini') yield* streamGemini(fullArgs);
  else throw new Error(`Provider desconhecido: ${provider}`);
}

export async function generateImage({
  modelId,
  prompt,
  imageBase64,
  imageMime,
}: {
  modelId: string;
  prompt: string;
  imageBase64?: string;
  imageMime?: string;
}): Promise<{ b64: string; mimeType: string }> {
  const m = getModel(modelId);
  if (!m) throw new Error('Modelo desconhecido');
  const apiKey = await getApiKey(m.provider);
  if (!apiKey) throw new MissingKeyError(m.provider);

  if (m.imageEndpoint === 'openai-images') {
    return generateOpenAIImage({ model: m.id, prompt, apiKey, imageBase64, imageMime });
  } else if (m.imageEndpoint === 'gemini-imagen') {
    return generateImagen({ prompt, apiKey });
  }
  throw new Error(`Modelo de imagem sem endpoint definido: ${modelId}`);
}
