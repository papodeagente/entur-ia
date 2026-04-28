'use client';

export default function MemoryToast({ content }: { content: string }) {
  return (
    <div className="bg-bg-secondary border border-emerald-700/40 rounded-xl shadow-2xl p-3 max-w-xs animate-slide-in">
      <div className="flex items-start gap-2">
        <div className="text-xl">💡</div>
        <div className="text-sm">
          <div className="font-medium text-emerald-300 mb-0.5">Memória atualizada</div>
          <div className="text-text-secondary text-xs">{content}</div>
        </div>
      </div>
    </div>
  );
}
