import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getModel } from '@/lib/models';
import { streamFromProvider, ChatMessage } from '@/lib/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface ChatRequest {
  conversationId?: string;
  modelId: string;
  message: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatRequest;
  const model = getModel(body.modelId);
  if (!model) {
    return new Response(JSON.stringify({ error: 'Modelo inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let conversationId = body.conversationId;
  let isNew = false;
  if (!conversationId) {
    const created = await prisma.conversation.create({
      data: { title: body.message.slice(0, 60) || 'Nova conversa' },
    });
    conversationId = created.id;
    isNew = true;
  }

  const previous = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  });

  await prisma.message.create({
    data: {
      conversationId,
      role: 'user',
      content: body.message,
    },
  });

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'Você é um assistente útil, claro e objetivo. Responda em português brasileiro por padrão, exceto quando o usuário escrever em outro idioma. Use markdown quando ajudar a clareza (listas, código, tabelas).',
    },
    ...previous.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: body.message },
  ];

  const encoder = new TextEncoder();
  let assistantText = '';

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        send({ type: 'meta', conversationId, isNew });

        for await (const chunk of streamFromProvider(model.provider, {
          model: model.id,
          messages,
        })) {
          assistantText += chunk;
          send({ type: 'delta', text: chunk });
        }

        await prisma.message.create({
          data: {
            conversationId: conversationId!,
            role: 'assistant',
            content: assistantText,
            model: model.id,
            provider: model.provider,
          },
        });

        if (isNew) {
          const newTitle = body.message.slice(0, 60).replace(/\n/g, ' ').trim() || 'Nova conversa';
          await prisma.conversation.update({
            where: { id: conversationId! },
            data: { title: newTitle, updatedAt: new Date() },
          });
        } else {
          await prisma.conversation.update({
            where: { id: conversationId! },
            data: { updatedAt: new Date() },
          });
        }

        send({ type: 'done' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
