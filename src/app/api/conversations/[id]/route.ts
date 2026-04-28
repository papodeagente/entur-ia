import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!conv) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
  return NextResponse.json(conv);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};
  if (typeof body.title === 'string') data.title = body.title;
  if (typeof body.systemPrompt === 'string') data.systemPrompt = body.systemPrompt || null;
  if (body.toolsConfig !== undefined) data.toolsConfig = body.toolsConfig;

  const conv = await prisma.conversation.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(conv);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.conversation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
