'use client';

import { useEffect, useState } from 'react';

interface Template {
  id: string;
  name: string;
  category: string | null;
  content: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (content: string) => void;
}

export default function TemplatesModal({ open, onClose, onPick }: Props) {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', content: '' });

  const refresh = async () => {
    setLoading(true);
    const res = await fetch('/api/templates');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setEditing(null);
      setCreating(false);
      setForm({ name: '', category: '', content: '' });
      refresh();
    }
  }, [open]);

  if (!open) return null;

  const startEdit = (t: Template) => {
    setEditing(t);
    setCreating(false);
    setForm({ name: t.name, category: t.category || '', content: t.content });
  };

  const startNew = () => {
    setCreating(true);
    setEditing(null);
    setForm({ name: '', category: '', content: '' });
  };

  const save = async () => {
    if (!form.name || !form.content) return;
    if (creating) {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else if (editing) {
      await fetch(`/api/templates/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setEditing(null);
    setCreating(false);
    await refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir template?')) return;
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    await refresh();
  };

  const grouped: Record<string, Template[]> = {};
  for (const t of items) {
    const cat = t.category || 'Geral';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(t);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Templates de prompt</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={startNew}
              className="text-sm px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 transition"
            >
              + Novo
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {(creating || editing) && (
            <div className="border border-white/10 rounded-xl p-4 space-y-2 bg-bg-input">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome do template"
                className="w-full bg-bg-secondary border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Categoria (ex: Trabalho, Dev, Texto)"
                className="w-full bg-bg-secondary border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Conteúdo do prompt..."
                rows={6}
                className="w-full bg-bg-secondary border border-white/10 rounded-lg px-3 py-2 text-sm font-mono"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setEditing(null);
                    setCreating(false);
                  }}
                  className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  className="text-sm px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/90"
                >
                  Salvar
                </button>
              </div>
            </div>
          )}

          {loading && <div className="text-sm text-text-tertiary">Carregando...</div>}

          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <div className="text-xs uppercase tracking-wide text-text-tertiary mb-2">{cat}</div>
              <div className="space-y-1">
                {list.map((t) => (
                  <div
                    key={t.id}
                    className="group border border-white/10 rounded-lg p-3 hover:bg-white/5 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => onPick(t.content)}
                        className="text-left flex-1 min-w-0"
                      >
                        <div className="font-medium text-sm">{t.name}</div>
                        <div className="text-xs text-text-tertiary mt-1 line-clamp-2 whitespace-pre-wrap">
                          {t.content.slice(0, 200)}
                        </div>
                      </button>
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
                        <button
                          onClick={() => startEdit(t)}
                          className="text-xs px-2 py-1 rounded hover:bg-white/10"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => remove(t.id)}
                          className="text-xs px-2 py-1 rounded hover:bg-red-900/30 text-red-300"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
