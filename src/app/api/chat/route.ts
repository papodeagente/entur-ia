import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getModel, isImageModel } from '@/lib/models';
import {
  streamFromProvider,
  generateImage,
  ChatMessage,
  Attachment,
  ToolFlags,
  StreamEvent,
} from '@/lib/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 600;

interface ChatRequest {
  conversationId?: string;
  modelId: string;
  message: string;
  attachments?: Attachment[];
  tools?: ToolFlags;
  systemPromptOverride?: string;
}

const DEFAULT_SYSTEM =
  'Você é o Entur IA, um assistente útil, claro e objetivo. Responda em português brasileiro por padrão, exceto quando o usuário escrever em outro idioma. Use markdown quando ajudar a clareza (listas, código, tabelas).';

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
      data: {
        title: body.message.slice(0, 60) || 'Nova conversa',
        systemPrompt: body.systemPromptOverride || null,
      },
    });
    conversationId = created.id;
    isNew = true;
  }

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { systemPrompt: true },
  });
  const systemPrompt = body.systemPromptOverride || conv?.systemPrompt || DEFAULT_SYSTEM;

  const previous = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true, attachments: true },
  });

  await prisma.message.create({
    data: {
      conversationId,
      role: 'user',
      content: body.message,
      attachments: body.attachments ? (body.attachments as any) : undefined,
    },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        send({ type: 'meta', conversationId, isNew });

        // ============ IMAGE GENERATION ============
        if (isImageModel(model.id)) {
          const firstAttachment = body.attachments?.find((a) => a.kind === 'image');
          send({ type: 'tool_start', tool: 'image_generation' });
          const result = await generateImage({
            modelId: model.id,
            prompt: body.message,
            imageBase64: firstAttachment?.data,
            imageMime: firstAttachment?.mimeType,
          });
          send({
            type: 'image',
            mimeType: result.mimeType,
            b64: result.b64,
            alt: body.message.slice(0, 80),
          });

          await prisma.message.create({
            data: {
              conversationId: conversationId!,
              role: 'assistant',
              content: '',
              outputs: { images: [{ mimeType: result.mimeType, b64: result.b64 }] } as any,
              model: model.id,
              provider: model.provider,
            },
          });

          if (isNew) {
            const newTitle = body.message.slice(0, 60).replace(/\n/g, ' ').trim() || 'Nova imagem';
            await prisma.conversation.update({
              where: { id: conversationId! },
              data: { title: newTitle },
            });
          } else {
            await prisma.conversation.update({
              where: { id: conversationId! },
              data: { updatedAt: new Date() },
            });
          }

          send({ type: 'done' });
          controller.close();
          return;
        }

        // ============ TEXT / MULTIMODAL CHAT ============
        const messages: ChatMessage[] = [
          { role: 'system', content: systemPrompt },
          ...previous.map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            attachments: m.attachments || undefined,
          })),
          {
            role: 'user',
            content: body.message,
            attachments: body.attachments,
          },
        ];

        let assistantText = '';
        let assistantThinking = '';
        const collectedImages: { mimeType: string; b64: string }[] = [];
        const collectedCitations: { url: string; title?: string }[] = [];

        for await (const evt of streamFromProvider(model.provider, {
          model: model.id,
          messages,
          tools: body.tools,
        })) {
          const e = evt as StreamEvent;
          if (e.type === 'delta') {
            assistantText += e.text;
            send(e);
          } else if (e.type === 'thinking') {
            assistantThinking += e.text;
            send(e);
          } else if (e.type === 'image') {
            collectedImages.push({ mimeType: e.mimeType, b64: e.b64 });
            send(e);
          } else if (e.type === 'citation') {
            collectedCitations.push({ url: e.url, title: e.title });
            send(e);
          } else {
            send(e);
          }
        }

        await prisma.message.create({
          data: {
            conversationId: conversationId!,
            role: 'assistant',
            content: assistantText,
            thinking: assistantThinking || null,
            outputs: collectedImages.length ? ({ images: collectedImages } as any) : undefined,
            citations: collectedCitations.length ? (collectedCitations as any) : undefined,
            model: model.id,
            provider: model.provider,
          },
        });

        if (isNew) {
          const newTitle = body.message.slice(0, 60).replace(/\n/g, ' ').trim() || 'Nova conversa';
          await prisma.conversation.update({
            where: { id: conversationId! },
            data: { title: newTitle },
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
