import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Entur IA',
  description: 'Chat unificado com GPT, Gemini e Claude',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-bg-primary text-text-primary antialiased">{children}</body>
    </html>
  );
}
