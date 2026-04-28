import { prisma } from './prisma';
import { encrypt, decrypt } from './crypto';
import { Provider } from './models';

export const SETTING_KEYS: Record<Provider, string> = {
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

export async function getApiKey(provider: Provider): Promise<string | null> {
  const key = SETTING_KEYS[provider];
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) {
    const fallback = process.env[key];
    return fallback || null;
  }
  try {
    return decrypt(row.value);
  } catch {
    return null;
  }
}

export async function setApiKey(provider: Provider, value: string): Promise<void> {
  const key = SETTING_KEYS[provider];
  const enc = encrypt(value);
  await prisma.setting.upsert({
    where: { key },
    update: { value: enc },
    create: { key, value: enc },
  });
}

export async function deleteApiKey(provider: Provider): Promise<void> {
  const key = SETTING_KEYS[provider];
  await prisma.setting.deleteMany({ where: { key } });
}

export async function getAllKeyStatus(): Promise<Record<Provider, { configured: boolean; preview: string | null }>> {
  const out = {} as Record<Provider, { configured: boolean; preview: string | null }>;
  for (const provider of Object.keys(SETTING_KEYS) as Provider[]) {
    const k = await getApiKey(provider);
    if (k) {
      out[provider] = {
        configured: true,
        preview: k.slice(0, 4) + '...' + k.slice(-4),
      };
    } else {
      out[provider] = { configured: false, preview: null };
    }
  }
  return out;
}
