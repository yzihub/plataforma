#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f .env.local ]; then
  set -a
  . ./.env.local
  set +a
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

git pull --rebase --autostash origin "$CURRENT_BRANCH"
npm install
npm run typecheck
npm run build

if command -v supabase >/dev/null 2>&1; then
  supabase db push --include-all
else
  npx supabase db push --include-all
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload ecosystem.config.js --update-env
else
  npx pm2 startOrReload ecosystem.config.js --update-env
fi

sleep 10
curl -fsS http://127.0.0.1:3333/health >/dev/null
curl -fsS http://127.0.0.1:3333/metrics >/dev/null

echo "runtime deploy completed"
