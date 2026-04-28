import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const memories = await prisma.userMemory.findMany({
    orderBy: [{ updatedAt: 'desc' }],
    take: 200,
  });
  return NextResponse.json(memories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.content || typeof body.content !== 'string' || body.content.length < 3) {
    return NextResponse.json({ error: 'content inválido' }, { status: 400 });
  }
  const m = await prisma.userMemory.create({
    data: {
      content: body.content.trim().slice(0, 500),
      category: body.category?.trim().slice(0, 30) || null,
      sourceConvId: body.sourceConvId || null,
    },
  });
  return NextResponse.json(m);
}

export async function DELETE() {
  await prisma.userMemory.deleteMany();
  return NextResponse.json({ ok: true });
}
