'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { ConversationListItem } from './ChatApp';

interface Props {
  conversations: ConversationListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenTemplates: () => void;
  onOpenCompare: () => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  userName?: string | null;
}

function formatGroup(d: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(d);
  const diffMs = today.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return 'Últimos 7 dias';
  if (days < 30) return 'Últimos 30 dias';
  if (days < 365) return 'Mais antigas';
  return 'Mais antigas';
}

const GROUP_ORDER = ['📌 Fixadas', 'Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias', 'Mais antigas'];

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose,
  onOpenSettings,
  onOpenTemplates,
  onOpenCompare,
  onRename,
  onTogglePin,
  userName,
}: Props) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, search]);

  const grouped = useMemo(() => {
    const out: Record<string, ConversationListItem[]> = {};
    for (const c of filtered) {
      const key = c.pinned ? '📌 Fixadas' : formatGroup(new Date(c.updatedAt));
      if (!out[key]) out[key] = [];
      out[key].push(c);
    }
    return out;
  }, [filtered]);

  const startEdit = (c: ConversationListItem) => {
    setEditingId(c.id);
    setEditValue(c.title);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <aside className="w-64 shrink-0 bg-bg-secondary flex flex-col h-full border-r border-black/20">
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <img src="/logo-mark.svg" alt="Entur" className="h-7 w-auto" />
        <span className="text-sm font-semibold text-text-primary">IA</span>
      </div>
      <div className="px-3 pb-2 flex items-center gap-2">
        <button
          onClick={onNew}
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nova conversa
        </button>
        <button
          onClick={onClose}
          title="Ocultar barra"
          className="p-2 rounded-lg hover:bg-white/5 transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h13M9 6l-6 6 6 6" />
          </svg>
        </button>
      </div>

      <div className="px-3 pb-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar conversas..."
          className="w-full text-sm bg-bg-input border border-white/10 rounded-lg px-3 py-1.5 outline-none focus:border-white/30 transition"
        />
      </div>

      <div className="px-3 pb-2 flex flex-wrap gap-1">
        <button
          onClick={onOpenTemplates}
          className="flex-1 text-xs px-2 py-1.5 rounded-md hover:bg-white/5 transition border border-white/10"
        >
          📋 Templates
        </button>
        <button
          onClick={onOpenCompare}
          className="flex-1 text-xs px-2 py-1.5 rounded-md hover:bg-white/5 transition border border-white/10"
        >
          ⚖️ Comparar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 && (
          <div className="text-sm text-text-tertiary px-3 py-2">
            {search ? 'Nada encontrado.' : 'Nenhuma conversa ainda.'}
          </div>
        )}
        {GROUP_ORDER.filter((g) => grouped[g]?.length).map((groupName) => (
          <div key={groupName} className="mb-2">
            <div className="text-xs text-text-tertiary px-2 py-1.5 uppercase tracking-wide">
              {groupName}
            </div>
            <ul className="space-y-0.5">
              {grouped[groupName].map((c) => (
                <li
                  key={c.id}
                  className={`group flex items-center rounded-lg ${
                    activeId === c.id ? 'bg-white/10' : 'hover:bg-white/5'
                  } transition`}
                >
                  {editingId === c.id ? (
                    <input
                      ref={editRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 bg-bg-input border border-white/20 rounded-md px-2 py-1.5 text-sm mx-1"
                    />
                  ) : (
                    <button
                      onClick={() => onSelect(c.id)}
                      onDoubleClick={() => startEdit(c)}
                      className="flex-1 text-left px-3 py-2 text-sm truncate flex items-center gap-1.5"
                      title={c.title + ' (duplo-clique para renomear)'}
                    >
                      {c.pinned && <span className="text-xs">📌</span>}
                      <span className="truncate">{c.title}</span>
                    </button>
                  )}
                  {editingId !== c.id && (
                    <div className="opacity-0 group-hover:opacity-100 flex transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(c.id, !c.pinned);
                        }}
                        title={c.pinned ? 'Desafixar' : 'Fixar'}
                        className="text-text-tertiary hover:text-yellow-400 px-1.5 py-2"
                      >
                        {c.pinned ? '📍' : '📌'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(c);
                        }}
                        title="Renomear"
                        className="text-text-tertiary hover:text-white px-1.5 py-2"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir "${c.title}"?`)) onDelete(c.id);
                        }}
                        title="Excluir"
                        className="text-text-tertiary hover:text-red-400 px-1.5 py-2"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition text-sm"
        >
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 via-blue-500 to-orange-500 flex items-center justify-center text-xs font-bold">
            {userName ? userName.charAt(0).toUpperCase() : '👤'}
          </span>
          <span className="flex-1 text-left">
            <div className="font-semibold text-text-primary truncate">
              {userName || 'Configurar perfil'}
            </div>
            <div className="text-xs text-text-tertiary">Perfil · APIs · Memórias</div>
          </span>
        </button>
      </div>
    </aside>
  );
}
