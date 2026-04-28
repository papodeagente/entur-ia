'use client';

import { useState } from 'react';

export default function CopyButton({
  text,
  className,
  label,
  iconOnly,
}: {
  text: string;
  className?: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className={className || 'text-xs px-2 py-1 rounded hover:bg-white/10 transition'}
      title={copied ? 'Copiado!' : 'Copiar'}
    >
      {iconOnly ? (
        copied ? '✓' : '⧉'
      ) : copied ? (
        '✓ Copiado'
      ) : (
        <>⧉ {label || 'Copiar'}</>
      )}
    </button>
  );
}
