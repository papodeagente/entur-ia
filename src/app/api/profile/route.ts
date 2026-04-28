import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserProfile } from '@/lib/userContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = await getUserProfile();
  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const data: any = {};
  if (typeof body.name === 'string') data.name = body.name.trim() || null;
  if (typeof body.role === 'string') data.role = body.role.trim() || null;
  if (typeof body.context === 'string') data.context = body.context.trim() || null;
  if (typeof body.customInstructions === 'string')
    data.customInstructions = body.customInstructions.trim() || null;
  if (typeof body.onboarded === 'boolean') data.onboarded = body.onboarded;

  const profile = await prisma.userProfile.upsert({
    where: { id: 'default' },
    update: data,
    create: { id: 'default', ...data },
  });
  return NextResponse.json(profile);
}
