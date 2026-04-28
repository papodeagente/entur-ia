import OpenAI from 'openai';
import { getApiKey } from './settings';

const FALLBACK_MODEL = 'gpt-4o-mini';

async function getOpenAIClient() {
  const key = await getApiKey('openai');
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export async function generateConversationTitle(opts: {
  userMessage: string;
  assistantReply: string;
}): Promise<string | null> {
  const client = await getOpenAIClient();
  if (!client) return null;

  try {
    const res = await client.chat.completions.create({
      model: FALLBACK_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Você gera títulos curtos (3-6 palavras) em português brasileiro para conversas de chat. Responda APENAS com o título, sem aspas, sem pontuação final. Capture o tópico central.',
        },
        {
          role: 'user',
          content: `Gere o título.\n\nUsuário: ${opts.userMessage.slice(0, 800)}\n\nAssistente: ${opts.assistantReply.slice(0, 800)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 30,
    });
    const title = res.choices[0]?.message?.content?.trim();
    if (!title) return null;
    return title.replace(/^["'`]|["'`.,:!?]+$/g, '').slice(0, 80);
  } catch {
    return null;
  }
}

export interface ExtractedMemory {
  content: string;
  category?: string;
}

export async function extractMemoriesFromExchange(opts: {
  userMessage: string;
  assistantReply: string;
  existingMemories: string[];
}): Promise<ExtractedMemory[]> {
  const client = await getOpenAIClient();
  if (!client) return [];

  const existingBlock = opts.existingMemories.length
    ? `\n\nMemórias já existentes (NÃO duplique):\n${opts.existingMemories.map((m, i) => `- ${m}`).join('\n')}`
    : '';

  try {
    const res = await client.chat.completions.create({
      model: FALLBACK_MODEL,
      messages: [
        {
          role: 'system',
          content: `Você é um sistema de extração de memórias. Analise a interação e identifique APENAS fatos novos e duradouros sobre o USUÁRIO que valeria lembrar em conversas futuras (preferências, projetos em andamento, contexto profissional, ferramentas que usa, restrições, gostos, etc).

REGRAS RÍGIDAS:
- NUNCA invente. Se não há fato claro, retorne lista vazia.
- Não salve fatos genéricos ("o usuário fez uma pergunta"), pedidos pontuais, ou estados temporários.
- Cada fato deve ser uma frase curta autoexplicativa (ex: "Trabalha com Next.js no Coolify").
- Categoria sugerida: trabalho, ferramentas, preferencias, projetos, pessoal, restricoes.
- Não duplique memórias existentes.

Responda APENAS JSON válido no formato {"memories": [{"content":"...", "category":"..."}]}. Se nada novo, {"memories":[]}.`,
        },
        {
          role: 'user',
          content: `Usuário: ${opts.userMessage.slice(0, 2000)}\n\nAssistente: ${opts.assistantReply.slice(0, 2000)}${existingBlock}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 400,
    });
    const json = res.choices[0]?.message?.content;
    if (!json) return [];
    const parsed = JSON.parse(json);
    const memories = parsed.memories;
    if (!Array.isArray(memories)) return [];
    return memories
      .filter((m: any) => m && typeof m.content === 'string' && m.content.length > 5)
      .map((m: any) => ({
        content: m.content.trim().slice(0, 300),
        category: typeof m.category === 'string' ? m.category.trim().slice(0, 30) : undefined,
      }))
      .slice(0, 5);
  } catch {
    return [];
  }
}
