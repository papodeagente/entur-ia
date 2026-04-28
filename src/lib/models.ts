export type Provider = 'openai' | 'gemini' | 'anthropic';

export type Capability =
  | 'text'
  | 'vision'
  | 'pdf'
  | 'image-gen'
  | 'image-edit'
  | 'web-search'
  | 'code-exec'
  | 'thinking'
  | 'reasoning';

export type ModelKind = 'chat' | 'image';

export interface ModelDef {
  id: string;
  label: string;
  provider: Provider;
  kind: ModelKind;
  description: string;
  badgeColor: string;
  capabilities: Capability[];
  // For image generation models
  imageEndpoint?: 'openai-images' | 'gemini-imagen' | 'gemini-flash-image';
  // Default tool flags shown as toggles in UI
  defaultTools?: { webSearch?: boolean; codeExec?: boolean; thinking?: boolean };
  // Sinaliza que o modelo NÃO funciona em chave free tier do provider
  requiresBilling?: boolean;
}

export const MODELS: ModelDef[] = [
  // ===== OpenAI =====
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    kind: 'chat',
    description: 'OpenAI flagship multimodal — vision + texto',
    badgeColor: 'bg-emerald-600',
    capabilities: ['text', 'vision', 'pdf'],
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    provider: 'openai',
    kind: 'chat',
    description: 'OpenAI rápido e barato com vision',
    badgeColor: 'bg-emerald-700',
    capabilities: ['text', 'vision'],
  },
  {
    id: 'o3',
    label: 'o3 (reasoning)',
    provider: 'openai',
    kind: 'chat',
    description: 'OpenAI reasoning de ponta — melhor para problemas difíceis',
    badgeColor: 'bg-emerald-500',
    capabilities: ['text', 'vision', 'reasoning'],
  },
  {
    id: 'o4-mini',
    label: 'o4-mini',
    provider: 'openai',
    kind: 'chat',
    description: 'OpenAI reasoning rápido e econômico',
    badgeColor: 'bg-emerald-400',
    capabilities: ['text', 'vision', 'reasoning'],
  },
  {
    id: 'gpt-image-1',
    label: 'GPT Image 1',
    provider: 'openai',
    kind: 'image',
    description: 'OpenAI gerador de imagem mais novo (geração + edição)',
    badgeColor: 'bg-emerald-600',
    capabilities: ['image-gen', 'image-edit'],
    imageEndpoint: 'openai-images',
  },
  {
    id: 'dall-e-3',
    label: 'DALL-E 3',
    provider: 'openai',
    kind: 'image',
    description: 'OpenAI clássico - imagens criativas',
    badgeColor: 'bg-emerald-700',
    capabilities: ['image-gen'],
    imageEndpoint: 'openai-images',
  },

  // ===== Google =====
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'gemini',
    kind: 'chat',
    description: 'Google rápido com thinking — free tier OK',
    badgeColor: 'bg-blue-500',
    capabilities: ['text', 'vision', 'pdf', 'thinking', 'web-search', 'code-exec'],
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    provider: 'gemini',
    kind: 'chat',
    description: 'Google multimodal nativo — free tier OK',
    badgeColor: 'bg-blue-400',
    capabilities: ['text', 'vision', 'pdf', 'web-search', 'code-exec'],
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    provider: 'gemini',
    kind: 'chat',
    description: 'Google contexto longo (2M tokens) — free tier OK',
    badgeColor: 'bg-blue-600',
    capabilities: ['text', 'vision', 'pdf', 'web-search', 'code-exec'],
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    provider: 'gemini',
    kind: 'chat',
    description: 'Google rápido e econômico — free tier OK',
    badgeColor: 'bg-blue-300',
    capabilities: ['text', 'vision', 'pdf'],
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    provider: 'gemini',
    kind: 'chat',
    description: 'Google flagship — exige billing ativo na conta Google',
    badgeColor: 'bg-blue-700',
    capabilities: ['text', 'vision', 'pdf', 'thinking', 'web-search', 'code-exec'],
    requiresBilling: true,
  },
  {
    id: 'imagen-3.0-generate-002',
    label: 'Imagen 3',
    provider: 'gemini',
    kind: 'image',
    description: 'Google fotorrealismo — exige billing ativo',
    badgeColor: 'bg-blue-600',
    capabilities: ['image-gen'],
    imageEndpoint: 'gemini-imagen',
    requiresBilling: true,
  },

  // ===== Anthropic =====
  {
    id: 'claude-opus-4-7',
    label: 'Claude Opus 4.7',
    provider: 'anthropic',
    kind: 'chat',
    description: 'Anthropic máximo poder — extended thinking, web search, code',
    badgeColor: 'bg-orange-700',
    capabilities: ['text', 'vision', 'pdf', 'thinking', 'web-search', 'code-exec'],
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    kind: 'chat',
    description: 'Anthropic equilibrado — extended thinking, web search, code',
    badgeColor: 'bg-orange-600',
    capabilities: ['text', 'vision', 'pdf', 'thinking', 'web-search', 'code-exec'],
  },
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    provider: 'anthropic',
    kind: 'chat',
    description: 'Anthropic rápido com tools',
    badgeColor: 'bg-orange-500',
    capabilities: ['text', 'vision', 'pdf', 'web-search', 'code-exec'],
  },
];

export const DEFAULT_MODEL = 'gpt-4o-mini';

export function getModel(id: string): ModelDef | undefined {
  return MODELS.find((m) => m.id === id);
}

export function modelHas(id: string, cap: Capability): boolean {
  return getModel(id)?.capabilities.includes(cap) ?? false;
}

export function isImageModel(id: string): boolean {
  return getModel(id)?.kind === 'image';
}
