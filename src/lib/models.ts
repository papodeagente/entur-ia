export type Provider = 'openai' | 'gemini' | 'anthropic';

export interface ModelDef {
  id: string;
  label: string;
  provider: Provider;
  description: string;
  badgeColor: string;
}

export const MODELS: ModelDef[] = [
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    description: 'OpenAI - Multimodal e equilibrado',
    badgeColor: 'bg-emerald-600',
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openai',
    description: 'OpenAI - Rápido e barato',
    badgeColor: 'bg-emerald-700',
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Google - Contexto longo, multimodal',
    badgeColor: 'bg-blue-600',
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    provider: 'gemini',
    description: 'Google - Rápido e econômico',
    badgeColor: 'bg-blue-500',
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    description: 'Anthropic - Equilibrado e poderoso',
    badgeColor: 'bg-orange-600',
  },
  {
    id: 'claude-opus-4-7',
    label: 'Claude Opus 4.7',
    provider: 'anthropic',
    description: 'Anthropic - Máxima capacidade',
    badgeColor: 'bg-orange-700',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    provider: 'anthropic',
    description: 'Anthropic - Rápido e leve',
    badgeColor: 'bg-orange-500',
  },
];

export const DEFAULT_MODEL = 'gpt-4o-mini';

export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}
