import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      title: true,
      pinned: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 200,
  });
  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const conv = await prisma.conversation.create({
    data: { title: body.title || 'Nova conversa' },
  });
  return NextResponse.json(conv);
}
