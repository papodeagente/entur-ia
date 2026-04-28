import { prisma } from './prisma';

export interface UserContextOpts {
  includeMemories?: boolean;
  maxMemories?: number;
}

export async function getUserProfile() {
  let profile = await prisma.userProfile.findUnique({ where: { id: 'default' } });
  if (!profile) {
    profile = await prisma.userProfile.create({ data: { id: 'default' } });
  }
  return profile;
}

export async function buildUserContextBlock(opts: UserContextOpts = {}): Promise<string> {
  const profile = await getUserProfile();
  const lines: string[] = [];

  const profileBits: string[] = [];
  if (profile.name) profileBits.push(`Nome: ${profile.name}`);
  if (profile.role) profileBits.push(`Função: ${profile.role}`);
  if (profile.context) profileBits.push(`Contexto: ${profile.context}`);
  if (profileBits.length) {
    lines.push('## Sobre o usuário');
    lines.push(profileBits.join('\n'));
  }

  if (profile.customInstructions) {
    lines.push('## Instruções customizadas');
    lines.push(profile.customInstructions);
  }

  if (opts.includeMemories !== false) {
    const memories = await prisma.userMemory.findMany({
      orderBy: { updatedAt: 'desc' },
      take: opts.maxMemories ?? 50,
    });
    if (memories.length) {
      lines.push('## Memórias salvas (fatos sobre o usuário aprendidos em conversas anteriores)');
      memories.forEach((m, i) => {
        lines.push(`${i + 1}. ${m.content}`);
      });
    }
  }

  return lines.join('\n\n');
}

export async function buildSystemPrompt(args: {
  conversationSystemPrompt?: string | null;
  defaultPrompt: string;
}): Promise<string> {
  const userBlock = await buildUserContextBlock();
  const parts: string[] = [];
  parts.push(args.conversationSystemPrompt || args.defaultPrompt);
  if (userBlock) {
    parts.push('---');
    parts.push(userBlock);
    parts.push('---');
    parts.push(
      'Use o contexto acima para personalizar suas respostas, mas não force referências artificiais. Se o usuário pedir para esquecer algo, responda confirmando e indique que ele pode remover memórias em Configurações > Memórias.'
    );
  }
  return parts.join('\n\n');
}
