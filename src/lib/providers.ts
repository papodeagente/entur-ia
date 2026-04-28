import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Provider } from './models';
import { getApiKey } from './settings';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamArgs {
  model: string;
  messages: ChatMessage[];
  apiKey: string;
}

export class MissingKeyError extends Error {
  provider: Provider;
  constructor(provider: Provider) {
    super(
      `Chave de API do provider "${provider}" não configurada. Acesse Configurações e cadastre a chave.`
    );
    this.provider = provider;
  }
}

export async function* streamOpenAI({ model, messages, apiKey }: StreamArgs): AsyncGenerator<string> {
  const client = new OpenAI({ apiKey });
  const stream = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

export async function* streamAnthropic({
  model,
  messages,
  apiKey,
}: StreamArgs): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey });
  const system = messages.find((m) => m.role === 'system')?.content;
  const conv = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const stream = await client.messages.stream({
    model,
    max_tokens: 4096,
    system,
    messages: conv,
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

export async function* streamGemini({
  model,
  messages,
  apiKey,
}: StreamArgs): AsyncGenerator<string> {
  const client = new GoogleGenerativeAI(apiKey);
  const systemMsg = messages.find((m) => m.role === 'system')?.content;
  const conv = messages.filter((m) => m.role !== 'system');

  const lastUser = conv[conv.length - 1];
  if (!lastUser || lastUser.role !== 'user') {
    throw new Error('Última mensagem deve ser do usuário');
  }

  const history = conv.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const generative = client.getGenerativeModel({
    model,
    systemInstruction: systemMsg,
  });
  const chat = generative.startChat({ history });
  const result = await chat.sendMessageStream(lastUser.content);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

export async function* streamFromProvider(
  provider: Provider,
  args: Omit<StreamArgs, 'apiKey'>
): AsyncGenerator<string> {
  const apiKey = await getApiKey(provider);
  if (!apiKey) throw new MissingKeyError(provider);

  const fullArgs: StreamArgs = { ...args, apiKey };

  if (provider === 'openai') yield* streamOpenAI(fullArgs);
  else if (provider === 'anthropic') yield* streamAnthropic(fullArgs);
  else if (provider === 'gemini') yield* streamGemini(fullArgs);
  else throw new Error(`Provider desconhecido: ${provider}`);
}
