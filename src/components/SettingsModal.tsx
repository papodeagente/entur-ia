'use client';

import { useEffect, useState } from 'react';
import { Provider } from '@/lib/models';

interface KeyStatus {
  configured: boolean;
  preview: string | null;
}

type StatusMap = Record<Provider, KeyStatus>;

interface Props {
  open: boolean;
  onClose: () => void;
}

const PROVIDERS: { id: Provider; label: string; placeholder: string; help: string; url: string }[] = [
  {
    id: 'openai',
    label: 'OpenAI (GPT)',
    placeholder: 'sk-...',
    help: 'Obtenha em platform.openai.com/api-keys',
    url: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    placeholder: 'AIza...',
    help: 'Obtenha em aistudio.google.com/apikey',
    url: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    placeholder: 'sk-ant-...',
    help: 'Obtenha em console.anthropic.com/settings/keys',
    url: 'https://console.anthropic.com/settings/keys',
  },
];

export default function SettingsModal({ open, onClose }: Props) {
  const [status, setStatus] = useState<StatusMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState<Partial<Record<Provider, string>>>({});
  const [savingProvider, setSavingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${res.status}`);
      }
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setInputs({});
      setOkMsg(null);
      refresh();
    }
  }, [open]);

  const save = async (provider: Provider) => {
    const value = inputs[provider]?.trim();
    if (!value) return;
    setSavingProvider(provider);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${res.status}`);
      }
      setOkMsg(`Chave ${provider} salva com sucesso.`);
      setInputs((prev) => ({ ...prev, [provider]: '' }));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSavingProvider(null);
    }
  };

  const remove = async (provider: Provider) => {
    if (!confirm(`Remover a chave ${provider}?`)) return;
    setSavingProvider(provider);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/settings?provider=${provider}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao remover');
      setOkMsg(`Chave ${provider} removida.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSavingProvider(null);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Configurações</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-sm text-text-secondary">
            Cadastre suas chaves de API para usar cada provider. As chaves são armazenadas
            criptografadas no banco.
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg p-3">
              {error}
            </div>
          )}
          {okMsg && (
            <div className="text-sm text-emerald-300 bg-emerald-900/20 border border-emerald-900/40 rounded-lg p-3">
              {okMsg}
            </div>
          )}

          {loading && !status && (
            <div className="text-sm text-text-tertiary">Carregando...</div>
          )}

          {status &&
            PROVIDERS.map((p) => {
              const s = status[p.id];
              return (
                <div key={p.id} className="border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm">{p.label}</div>
                      <div className="text-xs text-text-tertiary mt-0.5">
                        <a href={p.url} target="_blank" rel="noopener" className="underline">
                          {p.help}
                        </a>
                      </div>
                    </div>
                    {s.configured ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                        Configurada
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-text-tertiary border border-white/10">
                        Não configurada
                      </span>
                    )}
                  </div>

                  {s.configured && s.preview && (
                    <div className="text-xs text-text-tertiary font-mono bg-bg-input rounded-md px-3 py-2 my-2">
                      {s.preview}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <input
                      type="password"
                      placeholder={s.configured ? 'Substituir chave...' : p.placeholder}
                      value={inputs[p.id] || ''}
                      onChange={(e) => setInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      className="flex-1 bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                    />
                    <button
                      onClick={() => save(p.id)}
                      disabled={savingProvider === p.id || !inputs[p.id]?.trim()}
                      className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      {savingProvider === p.id ? 'Salvando...' : 'Salvar'}
                    </button>
                    {s.configured && (
                      <button
                        onClick={() => remove(p.id)}
                        disabled={savingProvider === p.id}
                        className="px-3 py-2 rounded-lg border border-red-900/40 text-red-300 text-sm hover:bg-red-900/20 transition"
                        title="Remover chave"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
