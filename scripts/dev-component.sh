#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)

. "$script_dir/dev-env.sh"
cd "$repo_root"

case "${1:-}" in
  migrate)
    DATABASE_HOST="${DATABASE_HOST:-127.0.0.1}" \
    DATABASE_PORT="${DATABASE_PORT:-$POSTGRES_PORT}" \
    DATABASE_NAME="${DATABASE_NAME:-$POSTGRES_DB}" \
    DATABASE_USER="${DATABASE_USER:-$POSTGRES_USER}" \
    DATABASE_PASSWORD="${DATABASE_PASSWORD:-$POSTGRES_PASSWORD}" \
    exec pnpm --filter @vote/server db:migration:up
    ;;
  api)
    DATABASE_HOST="${DATABASE_HOST:-127.0.0.1}" \
    DATABASE_PORT="${DATABASE_PORT:-$POSTGRES_PORT}" \
    DATABASE_NAME="${DATABASE_NAME:-$POSTGRES_DB}" \
    DATABASE_USER="${DATABASE_USER:-$POSTGRES_USER}" \
    DATABASE_PASSWORD="${DATABASE_PASSWORD:-$POSTGRES_PASSWORD}" \
    REDIS_HOST="${REDIS_HOST:-127.0.0.1}" \
    REDIS_PORT="$REDIS_PORT" \
    exec pnpm start:dev
    ;;
  worker)
    DATABASE_HOST="${DATABASE_HOST:-127.0.0.1}" \
    DATABASE_PORT="${DATABASE_PORT:-$POSTGRES_PORT}" \
    DATABASE_NAME="${DATABASE_NAME:-$POSTGRES_DB}" \
    DATABASE_USER="${DATABASE_USER:-$POSTGRES_USER}" \
    DATABASE_PASSWORD="${DATABASE_PASSWORD:-$POSTGRES_PASSWORD}" \
    exec pnpm start:worker:dev
    ;;
  ui)
    exec pnpm dev:ui
    ;;
  auth-service)
    exec docker compose logs --follow --tail=100 auth-service
    ;;
  auth-ui)
    exec docker compose logs --follow --tail=100 auth-ui
    ;;
  *)
    printf 'Usage: %s {migrate|api|worker|ui|auth-service|auth-ui}\n' "$0" >&2
    exit 2
    ;;
esac
