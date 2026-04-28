'use client';

import { useState } from 'react';

interface Props {
  open: boolean;
  onComplete: (profile: { name: string; role: string; context: string }) => void;
  onSkip: () => void;
}

export default function OnboardingModal({ open, onComplete, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [context, setContext] = useState('');

  if (!open) return null;

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    onComplete({ name: name.trim(), role: role.trim(), context: context.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">👋</div>
          <h2 className="text-2xl font-bold">Bem-vindo ao Entur IA</h2>
          <p className="text-sm text-text-secondary mt-2">
            Vamos personalizar sua experiência em 3 passos rápidos. Pode pular se preferir.
          </p>
        </div>

        <div className="flex gap-1 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded ${i <= step ? 'bg-white' : 'bg-white/10'}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Como você quer ser chamado?
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && next()}
              placeholder="Seu nome"
              className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-base"
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium">O que você faz?</label>
            <input
              autoFocus
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && next()}
              placeholder="Ex: Empreendedor, Engenheiro, Designer, Médico..."
              className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-base"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              No que você está focado agora? <span className="text-text-tertiary text-xs">(opcional)</span>
            </label>
            <textarea
              autoFocus
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Estou construindo um SaaS de logística, focado em vendas B2B..."
              rows={4}
              className="w-full bg-bg-input border border-white/10 rounded-lg px-4 py-3 text-base"
            />
            <div className="text-xs text-text-tertiary">
              💡 Conforme você for usando, o Entur IA vai aprender mais sobre você automaticamente.
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-6">
          {step === 0 ? (
            <button
              onClick={onSkip}
              className="text-sm text-text-tertiary hover:text-text-primary px-3 py-2"
            >
              Pular
            </button>
          ) : (
            <button
              onClick={back}
              className="text-sm text-text-secondary hover:text-text-primary px-3 py-2"
            >
              ← Voltar
            </button>
          )}
          <div className="flex-1" />
          {step < 2 ? (
            <button
              onClick={next}
              disabled={step === 0 && !name.trim()}
              className="px-5 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-30"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={finish}
              className="px-5 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90"
            >
              Vamos lá ✨
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
