'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MODELS, getModel } from '@/lib/models';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Result {
  modelId: string;
  text: string;
  thinking: string;
  citations: { url: string; title?: string }[];
  done: boolean;
  error?: string;
}

const DEFAULT_SELECTION = ['gpt-4o', 'gemini-2.5-pro', 'claude-sonnet-4-6'];

export default function CompareView({ open, onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);

  if (!open) return null;

  const chatModels = MODELS.filter((m) => m.kind === 'chat');

  const toggleModel = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const run = async () => {
    if (!prompt.trim() || selected.length === 0) return;
    setRunning(true);
    const initial: Record<string, Result> = {};
    for (const id of selected) {
      initial[id] = { modelId: id, text: '', thinking: '', citations: [], done: false };
    }
    setResults(initial);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelIds: selected, message: prompt }),
      });
      if (!res.ok || !res.body) throw new Error('Falha');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6).trim());
            const id = evt.modelId;
            if (!id && evt.type !== 'all_done') continue;
            setResults((prev) => {
              const cur = id ? prev[id] : null;
              if (!cur && evt.type !== 'all_done') return prev;
              if (evt.type === 'delta') {
                return { ...prev, [id]: { ...cur!, text: cur!.text + evt.text } };
              }
              if (evt.type === 'thinking') {
                return { ...prev, [id]: { ...cur!, thinking: cur!.thinking + evt.text } };
              }
              if (evt.type === 'citation') {
                return {
                  ...prev,
                  [id]: { ...cur!, citations: [...cur!.citations, { url: evt.url, title: evt.title }] },
                };
              }
              if (evt.type === 'done') {
                return { ...prev, [id]: { ...cur!, done: true } };
              }
              if (evt.type === 'error') {
                return { ...prev, [id]: { ...cur!, error: evt.message, done: true } };
              }
              return prev;
            });
          } catch {}
        }
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" onClick={onClose}>
      <div
        className="flex-1 flex flex-col bg-bg-primary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b border-white/10">
          <h2 className="font-semibold">Modo Comparar (arena)</h2>
          <button onClick={onClose} className="ml-auto p-2 rounded-lg hover:bg-white/5">
            ✕
          </button>
        </div>

        <div className="px-4 py-3 border-b border-white/10 space-y-2">
          <div className="text-xs text-text-tertiary">Selecione 2-4 modelos para comparar:</div>
          <div className="flex flex-wrap gap-1">
            {chatModels.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleModel(m.id)}
                className={`text-xs px-2 py-1 rounded-md border transition ${
                  selected.includes(m.id)
                    ? 'bg-white/15 border-white/30'
                    : 'bg-transparent border-white/10 hover:bg-white/5'
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${m.badgeColor}`} />
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Pergunta para todos os modelos selecionados..."
              rows={2}
              className="flex-1 bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={run}
              disabled={running || !prompt.trim() || selected.length === 0}
              className="px-4 rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-30"
            >
              {running ? 'Rodando...' : 'Comparar'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div
            className="grid h-full"
            style={{ gridTemplateColumns: `repeat(${Math.max(selected.length, 1)}, minmax(280px, 1fr))` }}
          >
            {selected.map((id) => {
              const m = getModel(id);
              const r = results[id];
              return (
                <div key={id} className="border-r border-white/10 last:border-r-0 overflow-y-auto p-4">
                  <div className="flex items-center gap-2 mb-3 sticky top-0 bg-bg-primary py-2">
                    <span className={`w-2 h-2 rounded-full ${m?.badgeColor}`} />
                    <span className="font-medium text-sm">{m?.label}</span>
                    {r?.done && !r.error && <span className="text-xs text-emerald-400">✓</span>}
                    {r?.error && <span className="text-xs text-red-400">erro</span>}
                  </div>
                  {r?.error ? (
                    <div className="text-xs text-red-300 bg-red-900/20 rounded p-2">{r.error}</div>
                  ) : (
                    <div className="markdown-body text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{r?.text || ''}</ReactMarkdown>
                    </div>
                  )}
                  {r?.citations?.length ? (
                    <div className="mt-3 text-xs text-text-tertiary">
                      <div className="mb-1">Fontes:</div>
                      {r.citations.map((c, i) => (
                        <div key={i}>
                          <a href={c.url} target="_blank" rel="noopener" className="text-blue-300 underline">
                            {i + 1}. {c.title || c.url}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
