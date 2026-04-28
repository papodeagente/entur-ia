#!/bin/sh
set -e

echo "Aplicando schema Prisma no banco..."
npx prisma db push --accept-data-loss --skip-generate || {
  echo "Falha ao aplicar schema. Continuando mesmo assim para diagnóstico..."
}

echo "Iniciando Next.js..."
exec "$@"
