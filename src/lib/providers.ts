import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Provider } from './models';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamArgs {
  model: string;
  messages: ChatMessage[];
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY não configurada no servidor');
  return new OpenAI({ apiKey: key });
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY não configurada no servidor');
  return new Anthropic({ apiKey: key });
}

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY não configurada no servidor');
  return new GoogleGenerativeAI(key);
}

export async function* streamOpenAI({ model, messages }: StreamArgs): AsyncGenerator<string> {
  const client = getOpenAI();
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

export async function* streamAnthropic({ model, messages }: StreamArgs): AsyncGenerator<string> {
  const client = getAnthropic();
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

export async function* streamGemini({ model, messages }: StreamArgs): AsyncGenerator<string> {
  const client = getGemini();
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
  args: StreamArgs
): AsyncGenerator<string> {
  if (provider === 'openai') yield* streamOpenAI(args);
  else if (provider === 'anthropic') yield* streamAnthropic(args);
  else if (provider === 'gemini') yield* streamGemini(args);
  else throw new Error(`Provider desconhecido: ${provider}`);
}
