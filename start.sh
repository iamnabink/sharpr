#!/usr/bin/env bash
# Sharpr — start everything.
#
# Usage:
#   ./start.sh            full stack in Docker: db + api + web  →  http://localhost:3000
#   ./start.sh --s3       same, plus MinIO (set STORAGE_BACKEND=s3 in .env to use it)
#   ./start.sh --logs     start, then follow container logs
#   ./start.sh --dev      developer mode: Postgres in Docker, API (:8000) and web (:3000)
#                         running natively with hot reload. Ctrl+C stops them.
#
# ./stop.sh stops whatever this started.

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
API="$ROOT/apps/api"
WEB="$ROOT/apps/web"

PROFILE=""
LOGS=0
DEV=0
for arg in "$@"; do
  case "$arg" in
    --s3) PROFILE="--profile s3" ;;
    --logs) LOGS=1 ;;
    --dev) DEV=1 ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }
port_in_use() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
need docker

if [ ! -f .env ]; then
  cp .env.example .env
  KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))' 2>/dev/null || openssl rand -base64 48 | tr -d '\n=/+')"
  sed -i.bak "s|^SECRET_KEY=.*|SECRET_KEY=$KEY|" .env && rm -f .env.bak
  echo "Created .env with a random SECRET_KEY. Edit it to change passwords or storage."
fi
mkdir -p data/recordings

# ── Docker mode ───────────────────────────────────────────────────────────
if [ "$DEV" = 0 ]; then
  set -e
  docker compose $PROFILE up -d --build
  echo
  echo "Sharpr is starting."
  echo "  App    http://localhost:3000   (create the first account — it becomes admin)"
  echo "  Docs   http://localhost:3000/docs"
  echo "  Admin  http://localhost:3000/admin"
  [ -n "$PROFILE" ] && echo "  MinIO  http://localhost:9001"
  echo
  echo "Stop with ./stop.sh"
  [ "$LOGS" = 1 ] && docker compose logs -f
  exit 0
fi

# ── Dev mode ──────────────────────────────────────────────────────────────
need python3; need npm
PIDS=()
cleanup() { echo; echo "Stopping dev servers…"; for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null; done; wait 2>/dev/null; }
trap cleanup INT TERM EXIT

echo "▸ Postgres (docker compose db)"
docker compose up -d db >/dev/null
for _ in $(seq 1 30); do docker compose exec -T db pg_isready -U "${POSTGRES_USER:-sharpr}" >/dev/null 2>&1 && break; sleep 1; done

DB_URL="${DATABASE_URL:-postgresql+psycopg://sharpr:sharpr@localhost:5432/sharpr}"
echo "▸ API"
if [ ! -d "$API/.venv" ]; then
  python3 -m venv "$API/.venv"
  "$API/.venv/bin/pip" install -q --upgrade pip
  "$API/.venv/bin/pip" install -q -e "$API[dev]"
fi
if port_in_use 8000; then
  echo "  port 8000 already in use — assuming the API is running"
else
  (
    cd "$API" && \
    DATABASE_URL="$DB_URL" STORAGE_LOCAL_PATH="$ROOT/data/recordings" SEED_DIR="$API/seed" .venv/bin/alembic upgrade head && \
    DATABASE_URL="$DB_URL" STORAGE_LOCAL_PATH="$ROOT/data/recordings" SEED_DIR="$API/seed" .venv/bin/uvicorn app.main:app --reload --port 8000
  ) &
  PIDS+=($!)
  for _ in $(seq 1 30); do curl -sf http://localhost:8000/health >/dev/null && break; sleep 1; done
fi
echo "  API      http://localhost:8000  (docs at /docs)"

echo "▸ Web"
[ -d "$WEB/node_modules" ] || (cd "$WEB" && npm install --no-audit --no-fund)
if port_in_use 3000; then
  echo "  port 3000 already in use — run ./stop.sh first"; exit 1
fi
(cd "$WEB" && API_INTERNAL_URL=http://localhost:8000 npm run dev) &
PIDS+=($!)
echo "  Web      http://localhost:3000"
echo
echo "Ready. Ctrl+C to stop."
wait
