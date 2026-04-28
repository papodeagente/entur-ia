import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const m = await prisma.userMemory.update({
    where: { id: params.id },
    data: {
      content: body.content?.trim().slice(0, 500),
      category: body.category?.trim().slice(0, 30) || null,
    },
  });
  return NextResponse.json(m);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.userMemory.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
