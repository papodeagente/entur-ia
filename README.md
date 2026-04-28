# Entur IA

Chat unificado com GPT (OpenAI), Gemini (Google) e Claude (Anthropic) numa única interface estilo ChatGPT.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Streaming via SSE para todos os 3 providers

## Variáveis de ambiente

Apenas duas obrigatórias no servidor:

```
DATABASE_URL=postgresql://user:pass@host:5432/db
APP_SECRET=string-aleatoria-32+chars-para-criptografar-as-chaves
```

As chaves das IAs (OpenAI, Gemini, Anthropic) são cadastradas **dentro do sistema**,
no botão **Configurações**. Ficam armazenadas criptografadas (AES-256-GCM) no banco.

## Desenvolvimento

```
npm install
cp .env.example .env  # preencha as chaves
npx prisma db push
npm run dev
```

## Deploy (Coolify)

Build command: padrão (Nixpacks detecta Next.js)
Port: 3000
