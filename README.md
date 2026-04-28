# Entur IA

Chat unificado com GPT (OpenAI), Gemini (Google) e Claude (Anthropic) numa única interface estilo ChatGPT.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Streaming via SSE para todos os 3 providers

## Variáveis de ambiente

```
DATABASE_URL=postgresql://user:pass@host:5432/db
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
```

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
