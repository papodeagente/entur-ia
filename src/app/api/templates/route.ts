import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULTS = [
  {
    name: 'Resumo executivo',
    category: 'Trabalho',
    content: 'Resuma o texto a seguir em 5 bullets, com foco em decisões e próximos passos:\n\n',
  },
  {
    name: 'Revisar código',
    category: 'Dev',
    content:
      'Revise o código abaixo e aponte: (1) bugs, (2) problemas de segurança, (3) melhorias de legibilidade, (4) edge cases não tratados.\n\n```\n\n```',
  },
  {
    name: 'Traduzir PT↔EN preservando tom',
    category: 'Texto',
    content:
      'Traduza o texto preservando tom, registro e nuances. Mantenha termos técnicos em inglês quando apropriado.\n\nTexto:\n',
  },
  {
    name: 'Plano de ação SMART',
    category: 'Trabalho',
    content:
      'Crie um plano de ação SMART (Específico, Mensurável, Atingível, Relevante, Temporal) para o objetivo:\n\n',
  },
  {
    name: 'Email comercial',
    category: 'Texto',
    content: 'Escreva um email cordial e direto, em pt-BR, sobre:\n\n',
  },
  {
    name: 'Explicar como para uma criança',
    category: 'Aprender',
    content: 'Explique de forma simples e divertida, como se eu tivesse 10 anos:\n\n',
  },
];

async function ensureDefaults() {
  const count = await prisma.template.count();
  if (count === 0) {
    await prisma.template.createMany({ data: DEFAULTS });
  }
}

export async function GET() {
  await ensureDefaults();
  const items = await prisma.template.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.content) {
    return NextResponse.json({ error: 'name e content são obrigatórios' }, { status: 400 });
  }
  const t = await prisma.template.create({
    data: {
      name: body.name,
      category: body.category || null,
      content: body.content,
    },
  });
  return NextResponse.json(t);
}
