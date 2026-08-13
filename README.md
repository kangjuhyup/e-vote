# Vote

pnpm workspace 기반 monorepo입니다.

## Structure

- `ui`: Next.js frontend workspace
- `server`: NestJS backend application

## Project Setup

```bash
pnpm install
```

## Server

```bash
# development
pnpm start

# watch mode
pnpm start:dev

# production mode
pnpm start:prod
```

## UI

```bash
# use Node 24
nvm use

# development
pnpm dev:ui

# production build
pnpm build:ui

# lint
pnpm lint:ui
```

### UI OIDC Auth

```bash
cp ui/.env.example ui/.env.local
```

Set `AUTH_SECRET`, then update `AUTH_OIDC_ISSUER` and
`AUTH_OIDC_TENANT_CODE` for the target tenant. The configured issuer becomes
`{AUTH_OIDC_ISSUER}/t/{AUTH_OIDC_TENANT_CODE}/oidc`. If the registered
client is confidential, also set `AUTH_E_VOTE_SECRET`.

Register this redirect URI in the OIDC auth server:

```text
{AUTH_URL}/api/auth/callback/e-vote
```

## Run Tests

```bash
# server unit tests
pnpm test

# UI unit tests
pnpm test:ui

# all workspace unit tests
pnpm test:all

# e2e tests
pnpm test:e2e

# test coverage
pnpm test:cov
```
