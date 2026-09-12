#!/usr/bin/env bash
# Sharpr dev runner — Postgres in a container, API and web running natively with hot reload.
#
# Usage:
#   ./run.sh            start db (docker), API (:8000, uvicorn --reload), web (:3000, next dev)
#   ./run.sh --api      only db + API
#   ./run.sh --web      only web (expects the API on :8000)
#
# Ctrl+C stops the API and web servers. The Postgres container keeps running
# (`docker compose stop db` to stop it). For the full containerized stack use ./start.sh.

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API="$ROOT/apps/api"
WEB="$ROOT/apps/web"
ONLY=""
for arg in "$@"; do
  case "$arg" in
    --api) ONLY=api ;;
    --web) ONLY=web ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

port_in_use() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }

PIDS=()
cleanup() { echo; echo "Stopping…"; for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null; done; wait 2>/dev/null; }
trap cleanup INT TERM EXIT

[ -f "$ROOT/.env" ] || cp "$ROOT/.env.example" "$ROOT/.env"

if [ "$ONLY" != "web" ]; then
  need docker; need python3
  echo "▸ Postgres (docker compose db)"
  docker compose -f "$ROOT/docker-compose.yml" up -d db >/dev/null
  for _ in $(seq 1 30); do docker compose -f "$ROOT/docker-compose.yml" exec -T db pg_isready -U "${POSTGRES_USER:-sharpr}" >/dev/null 2>&1 && break; sleep 1; done

  echo "▸ API"
  if [ ! -d "$API/.venv" ]; then
    python3 -m venv "$API/.venv"
    "$API/.venv/bin/pip" install -q --upgrade pip
    "$API/.venv/bin/pip" install -q -e "$API[dev]"
  fi
  mkdir -p "$ROOT/data/recordings"
  if port_in_use 8000; then
    echo "  port 8000 already in use — assuming the API is running"
  else
    (
      cd "$API" && \
      DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://sharpr:sharpr@localhost:5432/sharpr}" \
      STORAGE_LOCAL_PATH="$ROOT/data/recordings" SEED_DIR="$API/seed" \
      .venv/bin/alembic upgrade head && \
      DATABASE_URL="${DATABASE_URL:-postgresql+psycopg://sharpr:sharpr@localhost:5432/sharpr}" \
      STORAGE_LOCAL_PATH="$ROOT/data/recordings" SEED_DIR="$API/seed" \
      .venv/bin/uvicorn app.main:app --reload --port 8000
    ) &
    PIDS+=($!)
    for _ in $(seq 1 30); do curl -sf http://localhost:8000/health >/dev/null && break; sleep 1; done
    echo "  API      http://localhost:8000  (docs at /docs)"
  fi
fi

if [ "$ONLY" != "api" ]; then
  need npm
  echo "▸ Web"
  [ -d "$WEB/node_modules" ] || (cd "$WEB" && npm install --no-audit --no-fund)
  if port_in_use 3000; then
    echo "  port 3000 already in use — stop the other server first"; exit 1
  fi
  (cd "$WEB" && API_INTERNAL_URL=http://localhost:8000 npm run dev) &
  PIDS+=($!)
  echo "  Web      http://localhost:3000"
fi

echo
echo "Ready. Ctrl+C to stop."
wait
