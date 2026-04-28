'use client';

import { useState, useRef, useEffect } from 'react';
import { MODELS, getModel } from '@/lib/models';

interface Props {
  modelId: string;
  setModelId: (id: string) => void;
}

export default function ModelSelector({ modelId, setModelId }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = getModel(modelId);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sections = [
    {
      title: 'OpenAI · Texto',
      list: MODELS.filter((m) => m.provider === 'openai' && m.kind === 'chat'),
    },
    {
      title: 'OpenAI · Imagem',
      list: MODELS.filter((m) => m.provider === 'openai' && m.kind === 'image'),
    },
    {
      title: 'Google · Texto',
      list: MODELS.filter((m) => m.provider === 'gemini' && m.kind === 'chat'),
    },
    {
      title: 'Google · Imagem',
      list: MODELS.filter((m) => m.provider === 'gemini' && m.kind === 'image'),
    },
    {
      title: 'Anthropic · Texto',
      list: MODELS.filter((m) => m.provider === 'anthropic' && m.kind === 'chat'),
    },
  ].filter((s) => s.list.length > 0);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-white/10 transition text-sm"
      >
        {current && <span className={`w-2 h-2 rounded-full ${current.badgeColor}`} />}
        <span className="font-medium">{current?.label || 'Selecionar'}</span>
        {current?.kind === 'image' && (
          <span className="text-[10px] uppercase tracking-wide text-text-tertiary">img</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[60vh] overflow-y-auto bg-bg-tertiary border border-white/10 rounded-xl shadow-2xl z-50">
          {sections.map((sec) => (
            <div key={sec.title}>
              <div className="px-3 pt-2 pb-1 text-xs uppercase tracking-wide text-text-tertiary">
                {sec.title}
              </div>
              {sec.list.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setModelId(m.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-white/5 transition ${
                    m.id === modelId ? 'bg-white/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${m.badgeColor}`} />
                    <span className="font-medium text-sm">{m.label}</span>
                    {m.requiresBilling && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-300 border border-yellow-700/30">
                        $ billing
                      </span>
                    )}
                    {m.id === modelId && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs text-text-tertiary ml-4 mt-0.5">{m.description}</div>
                  {m.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-4 mt-1">
                      {m.capabilities.map((c) => (
                        <span
                          key={c}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-text-tertiary"
                        >
                          {capLabel(c)}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function capLabel(c: string): string {
  return (
    {
      text: '📝 texto',
      vision: '👁️ vision',
      pdf: '📄 pdf',
      'image-gen': '🎨 gera imagem',
      'image-edit': '✏️ edita imagem',
      'web-search': '🔎 web',
      'code-exec': '🐍 code',
      thinking: '💭 thinking',
      reasoning: '🧠 reasoning',
    } as Record<string, string>
  )[c] || c;
}
