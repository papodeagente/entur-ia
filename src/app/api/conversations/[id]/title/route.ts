import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateConversationTitle } from '@/lib/aiTasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 2,
      },
    },
  });
  if (!conv) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });

  const userMsg = conv.messages.find((m) => m.role === 'user')?.content;
  const asstMsg = conv.messages.find((m) => m.role === 'assistant')?.content;
  if (!userMsg || !asstMsg) return NextResponse.json({ title: conv.title });

  const title = await generateConversationTitle({
    userMessage: userMsg,
    assistantReply: asstMsg,
  });
  if (!title) return NextResponse.json({ title: conv.title });

  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: { title },
  });
  return NextResponse.json({ title: updated.title });
}
