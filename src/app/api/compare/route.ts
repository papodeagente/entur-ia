import { NextRequest } from 'next/server';
import { getModel } from '@/lib/models';
import { streamFromProvider, ChatMessage, ToolFlags, StreamEvent } from '@/lib/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 600;

interface CompareRequest {
  modelIds: string[];
  message: string;
  systemPrompt?: string;
  tools?: ToolFlags;
}

const DEFAULT_SYSTEM =
  'Você é o Entur IA, um assistente útil, claro e objetivo. Responda em português brasileiro.';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CompareRequest;
  if (!body.modelIds?.length || !body.message) {
    return new Response(JSON.stringify({ error: 'modelIds e message são obrigatórios' }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      const messages: ChatMessage[] = [
        { role: 'system', content: body.systemPrompt || DEFAULT_SYSTEM },
        { role: 'user', content: body.message },
      ];

      const tasks = body.modelIds.map(async (modelId) => {
        const m = getModel(modelId);
        if (!m) {
          send({ type: 'error', modelId, message: 'Modelo inválido' });
          return;
        }
        try {
          for await (const evt of streamFromProvider(m.provider, {
            model: m.id,
            messages,
            tools: body.tools,
          })) {
            const e = evt as StreamEvent;
            send({ ...e, modelId });
          }
          send({ type: 'done', modelId });
        } catch (err) {
          send({
            type: 'error',
            modelId,
            message: err instanceof Error ? err.message : 'Erro',
          });
        }
      });

      await Promise.all(tasks);
      send({ type: 'all_done' });
      controller.close();
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
