'use client';

import { useEffect, useState } from 'react';
import { ConversationDetail } from './ChatApp';

interface Props {
  open: boolean;
  onClose: () => void;
  conversation: ConversationDetail | null;
  onSaved: (c: ConversationDetail) => void;
}

const PRESETS = [
  { label: 'Padrão', value: '' },
  {
    label: 'Especialista jurídico BR',
    value:
      'Você é um especialista em direito brasileiro com foco em CLT, tributário e contratos. Responda com base na legislação vigente, citando artigos e jurisprudências quando relevante.',
  },
  {
    label: 'Engenheiro de software sênior',
    value:
      'Você é um engenheiro de software sênior. Priorize código limpo, testável, com tratamento explícito de edge cases. Sempre explique o trade-off das escolhas.',
  },
  {
    label: 'Coach executivo',
    value:
      'Você é um coach executivo. Faça perguntas que ajudem a clarificar pensamento. Não dê respostas prontas, ajude a pessoa a chegar nelas.',
  },
  {
    label: 'Tradutor preservando tom',
    value:
      'Você é um tradutor profissional. Preserve registro, tom e nuances culturais. Mantenha termos técnicos em inglês quando apropriado. Não traduza nomes próprios.',
  },
];

export default function ConversationSettingsModal({ open, onClose, conversation, onSaved }: Props) {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && conversation) {
      setSystemPrompt(conversation.systemPrompt || '');
    }
  }, [open, conversation]);

  if (!open || !conversation) return null;

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt }),
    });
    if (res.ok) {
      const updated = await res.json();
      onSaved({
        id: updated.id,
        title: updated.title,
        systemPrompt: updated.systemPrompt,
        toolsConfig: updated.toolsConfig,
      });
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Configurações da conversa</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">System prompt</div>
            <div className="text-xs text-text-tertiary mb-2">
              Define a "persona" e diretrizes do assistente para esta conversa específica. Aplica
              em todas as próximas mensagens.
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Ex: Você é um especialista em..."
              rows={8}
              className="w-full bg-bg-input border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs text-text-tertiary mb-2">Presets:</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setSystemPrompt(p.value)}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/5">
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="text-sm px-4 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
