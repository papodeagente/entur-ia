'use client';

import { useEffect, useState } from 'react';
import { Provider } from '@/lib/models';

type Tab = 'profile' | 'api' | 'memories';

interface KeyStatus {
  configured: boolean;
  preview: string | null;
}
type StatusMap = Record<Provider, KeyStatus>;

interface UserProfile {
  name: string | null;
  role: string | null;
  context: string | null;
  customInstructions: string | null;
  onboarded: boolean;
}

interface Memory {
  id: string;
  content: string;
  category: string | null;
  createdAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
  onProfileChange?: (p: UserProfile) => void;
}

const PROVIDERS: { id: Provider; label: string; placeholder: string; help: string; url: string }[] = [
  {
    id: 'openai',
    label: 'OpenAI (GPT, o3, DALL-E, gpt-image-1)',
    placeholder: 'sk-...',
    help: 'Obtenha em platform.openai.com/api-keys',
    url: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    label: 'Google Gemini (Gemini, Imagen)',
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

export default function SettingsModal({ open, onClose, initialTab, onProfileChange }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab || 'profile');

  useEffect(() => {
    if (open && initialTab) setTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Configurações</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5">
            ✕
          </button>
        </div>

        <div className="flex border-b border-white/10">
          <TabButton active={tab === 'profile'} onClick={() => setTab('profile')}>
            👤 Perfil
          </TabButton>
          <TabButton active={tab === 'memories'} onClick={() => setTab('memories')}>
            🧠 Memórias
          </TabButton>
          <TabButton active={tab === 'api'} onClick={() => setTab('api')}>
            🔑 Chaves de API
          </TabButton>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'profile' && <ProfileTab onSaved={onProfileChange} />}
          {tab === 'memories' && <MemoriesTab />}
          {tab === 'api' && <ApiTab />}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
        active
          ? 'border-white text-white'
          : 'border-transparent text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function ProfileTab({ onSaved }: { onSaved?: (p: UserProfile) => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetch('/api/profile').then(async (r) => {
      if (r.ok) setProfile(await r.json());
    });
  }, []);

  if (!profile) return <div className="text-sm text-text-tertiary">Carregando...</div>;

  const update = (k: keyof UserProfile, v: string) => {
    setProfile({ ...profile, [k]: v } as UserProfile);
    setOk(false);
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, onboarded: true }),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      onSaved?.(data);
      setOk(true);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-text-secondary">
        Essas informações são incluídas nas conversas para personalizar respostas.
      </div>

      <Field label="Como você quer ser chamado?">
        <input
          value={profile.name || ''}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Ex: Bruno"
          className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm"
        />
      </Field>

      <Field label="O que você faz?">
        <input
          value={profile.role || ''}
          onChange={(e) => update('role', e.target.value)}
          placeholder="Ex: Empreendedor / Engenheiro de software / Médica"
          className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Contexto extra (em que está trabalhando, ferramentas, foco)">
        <textarea
          value={profile.context || ''}
          onChange={(e) => update('context', e.target.value)}
          placeholder="Ex: Estou construindo SaaS de logística, uso Next.js + Coolify, foco em vendas B2B"
          rows={3}
          className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Instruções customizadas (como o assistente deve se comportar)">
        <textarea
          value={profile.customInstructions || ''}
          onChange={(e) => update('customInstructions', e.target.value)}
          placeholder="Ex: Seja direto, sem rodeios. Cite fontes quando possível. Responda em pt-BR."
          rows={4}
          className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm"
        />
      </Field>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
        {ok && <span className="text-sm text-emerald-300">✓ Salvo</span>}
      </div>
    </div>
  );
}

function MemoriesTab() {
  const [items, setItems] = useState<Memory[] | null>(null);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const refresh = async () => {
    const res = await fetch('/api/memories');
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => {
    refresh();
  }, []);

  const add = async () => {
    if (!newContent.trim()) return;
    await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent }),
    });
    setNewContent('');
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir esta memória?')) return;
    await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    refresh();
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    await fetch(`/api/memories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editValue }),
    });
    setEditingId(null);
    refresh();
  };

  const removeAll = async () => {
    if (!confirm('Apagar TODAS as memórias? Não dá para desfazer.')) return;
    await fetch('/api/memories', { method: 'DELETE' });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-text-secondary">
        O Entur IA aprende sobre você ao longo das conversas e salva fatos relevantes aqui. Esses
        fatos entram automaticamente nas próximas conversas, criando continuidade e personalização.
      </div>

      <div className="bg-bg-input border border-white/10 rounded-xl p-3">
        <div className="text-xs text-text-tertiary mb-2">Adicionar memória manualmente:</div>
        <div className="flex gap-2">
          <input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Ex: Tenho 3 filhos. Prefiro respostas com bullets."
            className="flex-1 bg-bg-secondary border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={add}
            disabled={!newContent.trim()}
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-30"
          >
            Adicionar
          </button>
        </div>
      </div>

      {items === null && <div className="text-sm text-text-tertiary">Carregando...</div>}
      {items && items.length === 0 && (
        <div className="text-sm text-text-tertiary text-center py-6 bg-bg-input rounded-xl">
          Nenhuma memória ainda. Converse normalmente que o sistema vai começar a lembrar.
        </div>
      )}

      {items && items.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="text-xs text-text-tertiary">{items.length} memória(s) salva(s)</div>
            <button
              onClick={removeAll}
              className="text-xs text-red-300 hover:text-red-200"
            >
              Apagar todas
            </button>
          </div>

          <ul className="space-y-1.5">
            {items.map((m) => (
              <li
                key={m.id}
                className="group flex items-start gap-2 p-3 rounded-lg border border-white/10 hover:bg-white/5 transition"
              >
                {editingId === m.id ? (
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(m.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="flex-1 bg-bg-secondary border border-white/20 rounded-md px-2 py-1 text-sm"
                  />
                ) : (
                  <div className="flex-1 text-sm">
                    {m.category && (
                      <span className="text-[10px] uppercase tracking-wide bg-white/5 px-1.5 py-0.5 rounded mr-2 text-text-tertiary">
                        {m.category}
                      </span>
                    )}
                    {m.content}
                  </div>
                )}
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
                  <button
                    onClick={() => {
                      setEditingId(m.id);
                      setEditValue(m.content);
                    }}
                    className="text-xs text-text-tertiary hover:text-white px-1.5"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    className="text-xs text-text-tertiary hover:text-red-400 px-1.5"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ApiTab() {
  const [status, setStatus] = useState<StatusMap | null>(null);
  const [inputs, setInputs] = useState<Partial<Record<Provider, string>>>({});
  const [saving, setSaving] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch('/api/settings');
    if (res.ok) setStatus(await res.json());
  };

  useEffect(() => {
    refresh();
  }, []);

  const save = async (p: Provider) => {
    const v = inputs[p]?.trim();
    if (!v) return;
    setSaving(p);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: p, apiKey: v }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erro');
      setInputs((prev) => ({ ...prev, [p]: '' }));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(null);
    }
  };

  const remove = async (p: Provider) => {
    if (!confirm(`Remover chave ${p}?`)) return;
    await fetch(`/api/settings?provider=${p}`, { method: 'DELETE' });
    refresh();
  };

  if (!status) return <div className="text-sm text-text-tertiary">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="text-sm text-text-secondary">
        As chaves são armazenadas criptografadas (AES-256-GCM) no banco.
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg p-3">
          {error}
        </div>
      )}

      {PROVIDERS.map((p) => {
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
                className="flex-1 bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => save(p.id)}
                disabled={saving === p.id || !inputs[p.id]?.trim()}
                className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-30"
              >
                {saving === p.id ? 'Salvando...' : 'Salvar'}
              </button>
              {s.configured && (
                <button
                  onClick={() => remove(p.id)}
                  className="px-3 py-2 rounded-lg border border-red-900/40 text-red-300 text-sm hover:bg-red-900/20"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}
