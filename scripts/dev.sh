#!/bin/sh
set -eu

: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DB:=vote}"
: "${POSTGRES_USER:=vote}"
: "${POSTGRES_PASSWORD:=vote}"
: "${REDIS_PORT:=6381}"
: "${AUTH_SERVICE_PORT:=3002}"
: "${AUTH_UI_PORT:=3003}"
: "${AUTH_ADMIN_USERNAME:=admin}"
: "${AUTH_ADMIN_PASSWORD:=vote-local-admin-password-change-me}"
: "${AUTH_SECRET:=vote-local-next-auth-secret-change-me}"
: "${AUTH_URL:=http://localhost:3001}"
: "${AUTH_TRUST_HOST:=true}"
: "${AUTH_OIDC_ISSUER:=http://localhost:$AUTH_SERVICE_PORT}"
: "${AUTH_OIDC_TENANT_CODE:=acme}"
: "${VOTE_AUTH_AUDIENCE:=https://vote-api.example.com}"
: "${VOTE_AUTH_INTROSPECTION_CLIENT_ID:=vote-api}"
: "${VOTE_AUTH_INTROSPECTION_CLIENT_SECRET:=vote-local-introspection-secret-change-me}"
: "${PERSONAL_DATA_ENCRYPTION_SECRET:=vote-local-personal-data-secret-change-me}"
: "${AUTH_E_VOTE_RESOURCE:=$VOTE_AUTH_AUDIENCE}"

export POSTGRES_PORT
export POSTGRES_DB
export POSTGRES_USER
export POSTGRES_PASSWORD
export REDIS_PORT
export AUTH_SERVICE_PORT
export AUTH_UI_PORT
export AUTH_ADMIN_USERNAME
export AUTH_ADMIN_PASSWORD
export AUTH_SECRET
export AUTH_URL
export AUTH_TRUST_HOST
export AUTH_OIDC_ISSUER
export AUTH_OIDC_TENANT_CODE
export VOTE_AUTH_AUDIENCE
export VOTE_AUTH_INTROSPECTION_CLIENT_ID
export VOTE_AUTH_INTROSPECTION_CLIENT_SECRET
export PERSONAL_DATA_ENCRYPTION_SECRET
export AUTH_E_VOTE_RESOURCE

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

DATABASE_HOST="${DATABASE_HOST:-127.0.0.1}" \
DATABASE_PORT="${DATABASE_PORT:-$POSTGRES_PORT}" \
DATABASE_NAME="${DATABASE_NAME:-$POSTGRES_DB}" \
DATABASE_USER="${DATABASE_USER:-$POSTGRES_USER}" \
DATABASE_PASSWORD="${DATABASE_PASSWORD:-$POSTGRES_PASSWORD}" \
pnpm start:worker:dev &
worker_pid=$!

pnpm dev:ui &
ui_pid=$!

cleanup() {
  kill "$server_pid" "$worker_pid" "$ui_pid" 2>/dev/null || true
}

trap cleanup INT TERM EXIT
wait "$server_pid" "$worker_pid" "$ui_pid"
