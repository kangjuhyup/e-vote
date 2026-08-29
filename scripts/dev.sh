#!/bin/sh
set -eu

: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DB:=vote}"
: "${POSTGRES_USER:=vote}"
: "${POSTGRES_PASSWORD:=vote}"
: "${REDIS_PORT:=6381}"
: "${AUTH_SERVICE_PORT:=3002}"

export POSTGRES_PORT
export POSTGRES_DB
export POSTGRES_USER
export POSTGRES_PASSWORD
export REDIS_PORT
export AUTH_SERVICE_PORT

docker compose up -d --wait

DATABASE_HOST="${DATABASE_HOST:-127.0.0.1}" \
DATABASE_PORT="${DATABASE_PORT:-$POSTGRES_PORT}" \
DATABASE_NAME="${DATABASE_NAME:-$POSTGRES_DB}" \
DATABASE_USER="${DATABASE_USER:-$POSTGRES_USER}" \
DATABASE_PASSWORD="${DATABASE_PASSWORD:-$POSTGRES_PASSWORD}" \
REDIS_HOST="${REDIS_HOST:-127.0.0.1}" \
REDIS_PORT="$REDIS_PORT" \
pnpm start:dev &
server_pid=$!

pnpm dev:ui &
ui_pid=$!

cleanup() {
  kill "$server_pid" "$ui_pid" 2>/dev/null || true
}

trap cleanup INT TERM EXIT
wait "$server_pid" "$ui_pid"
