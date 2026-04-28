'use client';

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
}

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
}: Props) {
  return (
    <aside className="w-64 shrink-0 bg-bg-secondary flex flex-col h-full border-r border-black/20">
      <div className="p-3 flex items-center gap-2">
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
        <div className="text-xs text-text-tertiary px-2 py-2 uppercase tracking-wide">
          Conversas
        </div>
        {conversations.length === 0 && (
          <div className="text-sm text-text-tertiary px-3 py-2">Nenhuma conversa ainda.</div>
        )}
        <ul className="space-y-0.5">
          {conversations.map((c) => (
            <li
              key={c.id}
              className={`group flex items-center rounded-lg ${
                activeId === c.id ? 'bg-white/10' : 'hover:bg-white/5'
              } transition`}
            >
              <button
                onClick={() => onSelect(c.id)}
                className="flex-1 text-left px-3 py-2 text-sm truncate"
              >
                {c.title}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Excluir "${c.title}"?`)) onDelete(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-400 px-2 py-2 transition"
                title="Excluir"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H10a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V10a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Configurações de API
        </button>
        <div className="text-xs text-text-tertiary px-1">
          <div className="font-semibold text-text-secondary">Entur IA</div>
          <div>GPT · Gemini · Claude</div>
        </div>
      </div>
    </aside>
  );
}
