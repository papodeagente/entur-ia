import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractMemoriesFromExchange } from '@/lib/aiTasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Body {
  userMessage: string;
  assistantReply: string;
  conversationId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body.userMessage || !body.assistantReply) {
      return NextResponse.json({ saved: [] });
    }

    const existing = await prisma.userMemory.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: { content: true },
    });

    const extracted = await extractMemoriesFromExchange({
      userMessage: body.userMessage,
      assistantReply: body.assistantReply,
      existingMemories: existing.map((e) => e.content),
    });

    const saved = [];
    for (const mem of extracted) {
      const created = await prisma.userMemory.create({
        data: {
          content: mem.content,
          category: mem.category || null,
          sourceConvId: body.conversationId || null,
        },
      });
      saved.push(created);
    }
    return NextResponse.json({ saved });
  } catch (err) {
    return NextResponse.json({ saved: [], error: err instanceof Error ? err.message : 'Erro' });
  }
}
