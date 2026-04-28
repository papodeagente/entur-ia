#!/bin/sh
set -e

PRISMA_BIN="/app/node_modules/prisma/build/index.js"

echo "Aplicando schema Prisma no banco..."
if [ -f "$PRISMA_BIN" ]; then
  for i in 1 2 3 4 5; do
    if node "$PRISMA_BIN" db push --accept-data-loss --skip-generate; then
      echo "Schema aplicado com sucesso."
      break
    fi
    echo "Tentativa $i falhou, aguardando 5s..."
    sleep 5
  done
else
  echo "AVISO: Prisma CLI não encontrado em $PRISMA_BIN — pulando db push."
fi

echo "Iniciando Next.js..."
exec "$@"
