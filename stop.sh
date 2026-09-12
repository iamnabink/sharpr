#!/usr/bin/env bash
# Sharpr — stop everything ./start.sh started.
#
# Usage:
#   ./stop.sh            stop containers and any native dev servers (data is kept)
#   ./stop.sh --reset    also DELETE the database volume (asks first). Recordings in ./data stay.

set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
RESET=0
for arg in "$@"; do
  case "$arg" in
    --reset) RESET=1 ;;
    -h|--help) sed -n '2,6p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

# native dev servers from `./start.sh --dev`
pkill -f "uvicorn app.main:app" 2>/dev/null && echo "Stopped API (dev)"
pkill -f "next dev" 2>/dev/null && echo "Stopped web (dev)"

if command -v docker >/dev/null 2>&1; then
  if [ "$RESET" = 1 ]; then
    read -r -p "Delete the database volume? All accounts, attempts and reviews will be lost. [y/N] " a
    if [ "$a" = "y" ]; then docker compose --profile s3 down -v; echo "Database volume deleted."; else echo "Kept."; fi
  else
    docker compose --profile s3 down
  fi
fi
echo "Stopped."
