#!/usr/bin/env bash
# Sharpr — run the full stack in Docker (db + api + web). This is how a server runs it.
#
# Usage:
#   ./start.sh            build images and start everything (http://localhost:3000)
#   ./start.sh --s3       also start MinIO (set STORAGE_BACKEND=s3 in .env to use it)
#   ./start.sh --logs     start, then follow logs
#   ./start.sh --down     stop and remove containers (data volumes are kept)
#   ./start.sh --reset    stop and DELETE the database volume (asks first)

set -eu
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
command -v docker >/dev/null 2>&1 || { echo "Docker is required: https://docs.docker.com/get-docker/"; exit 1; }

PROFILE=""
LOGS=0
for arg in "$@"; do
  case "$arg" in
    --s3) PROFILE="--profile s3" ;;
    --logs) LOGS=1 ;;
    --down) docker compose down; exit 0 ;;
    --reset)
      read -r -p "Delete the database volume and all recordings metadata? [y/N] " a
      [ "$a" = "y" ] && docker compose down -v; exit 0 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

if [ ! -f .env ]; then
  cp .env.example .env
  KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))' 2>/dev/null || openssl rand -base64 48 | tr -d '\n=/+')"
  sed -i.bak "s|^SECRET_KEY=.*|SECRET_KEY=$KEY|" .env && rm -f .env.bak
  echo "Created .env with a random SECRET_KEY. Edit it to change passwords or storage."
fi
mkdir -p data/recordings

docker compose $PROFILE up -d --build
echo
echo "Sharpr is starting."
echo "  App    http://localhost:3000   (create the first account — it becomes admin)"
echo "  Docs   http://localhost:3000/docs"
echo "  Admin  http://localhost:3000/admin"
[ -n "$PROFILE" ] && echo "  MinIO  http://localhost:9001"
echo
echo "Stop with ./start.sh --down"
[ "$LOGS" = 1 ] && docker compose logs -f
exit 0
