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

  const grouped = {
    OpenAI: MODELS.filter((m) => m.provider === 'openai'),
    Google: MODELS.filter((m) => m.provider === 'gemini'),
    Anthropic: MODELS.filter((m) => m.provider === 'anthropic'),
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-tertiary hover:bg-white/10 transition text-sm"
      >
        {current && (
          <span className={`w-2 h-2 rounded-full ${current.badgeColor}`} />
        )}
        <span className="font-medium">{current?.label || 'Selecionar'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-bg-tertiary border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          {Object.entries(grouped).map(([group, list]) => (
            <div key={group}>
              <div className="px-3 pt-2 pb-1 text-xs uppercase tracking-wide text-text-tertiary">
                {group}
              </div>
              {list.map((m) => (
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
                    {m.id === modelId && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs text-text-tertiary ml-4 mt-0.5">{m.description}</div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
