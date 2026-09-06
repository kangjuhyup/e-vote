#!/bin/sh

if [ -z "${COMPOSE_PROJECT_NAME:-}" ] && command -v docker >/dev/null 2>&1; then
  existing_compose_project=$(
    docker inspect \
      --format '{{ index .Config.Labels "com.docker.compose.project" }}' \
      vote-postgres 2>/dev/null || true
  )
  if [ -n "$existing_compose_project" ]; then
    COMPOSE_PROJECT_NAME=$existing_compose_project
  fi
fi

: "${COMPOSE_PROJECT_NAME:=vote}"
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
export COMPOSE_PROJECT_NAME
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
