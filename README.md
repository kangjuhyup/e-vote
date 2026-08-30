# Vote

pnpm workspace 기반 monorepo입니다.

## Structure

- `ui`: Next.js frontend workspace
- `server`: NestJS backend application

## Project Setup

```bash
pnpm install
```

## Local Development

```bash
# start PostgreSQL, Redis, the OIDC auth service and admin UI, the API server,
# and the vote UI
pnpm dev
```

The default local ports are `5432` for PostgreSQL, `6381` for Redis, `3000`
for the API server, `3001` for the vote UI, `3002` for the OIDC auth service,
and `3003` for the auth admin UI.

Open the auth admin UI at <http://localhost:3003>. Its Nginx gateway proxies
admin and tenant API requests to the `auth-service` container so the UI and
API share the same browser origin.

The auth integration uses the v0.2.0 feature baseline plus the published
post-release migration/bootstrap container fixes. Immutable GHCR digests are
pinned by default and can be overridden with `AUTH_SERVICE_IMAGE` and
`AUTH_UI_IMAGE`. Compose keeps auth data in a dedicated PostgreSQL database,
runs migrations, bootstraps the `master` and `acme` tenants, and registers the
public `e-vote` OIDC client before starting the admin UI.

The local admin credentials default to `admin` /
`vote-local-admin-password-change-me`. Override `AUTH_ADMIN_USERNAME` and
`AUTH_ADMIN_PASSWORD` outside local development.

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

# mock development (vote API and OIDC auth servers are not required)
pnpm dev:ui:mock

# production build
pnpm build:ui

# lint
pnpm lint:ui
```

### UI OIDC Auth

```bash
cp ui/.env.example ui/.env.local
```

`pnpm dev` supplies local defaults for `AUTH_SECRET`, `AUTH_URL`,
`AUTH_OIDC_ISSUER`, and `AUTH_OIDC_TENANT_CODE`. When running the UI alone,
copy the example file and replace `AUTH_SECRET` with a generated value. Update
the issuer and tenant code for non-local environments. The configured issuer becomes
`{AUTH_OIDC_ISSUER}/t/{AUTH_OIDC_TENANT_CODE}/oidc`. If the registered
client is confidential, also set `AUTH_E_VOTE_SECRET`.

Register this redirect URI in the OIDC auth server:

```text
{AUTH_URL}/api/auth/callback/e-vote
```

The local Compose bootstrap registers
`http://localhost:3001/api/auth/callback/e-vote` automatically. Override it
with `AUTH_CLIENT_REDIRECT_URI` when the vote UI origin changes.

### UI Mock Mode

Set `NEXT_PUBLIC_VOTE_API_MODE=mock` or run `pnpm dev:ui:mock`. In mock mode,
the UI reads local vote fixtures, does not call the configured vote API,
disables the `/api/vote-server` proxy rewrite, and uses a local `Mock 관리자`
session without contacting the OIDC server. The client-side NextAuth session
provider and logout action are also disabled. An `API · 인증 Mock` badge is
shown in the application header so the active mode is visible.

Use `live` (the default) to connect to `NEXT_PUBLIC_VOTE_API_BASE_URL` and the
configured OIDC issuer. Restart the Next.js development server after changing
the mode. Mock mode is intended for local UI development only.

### UI Operations Routes

- `/votes/new`: create a parent vote, child vote, candidates, and electors
- `/votes/[voteId]/sub-votes/[voteDetailId]`: inspect policy, turnout, and results
- `/votes/[voteId]/electors`: inspect and register electors
- `/commissions`: create election commissions and register members
- `/field-sessions`: create and operate onsite or visit voting sessions

The current server exposes write APIs but no list APIs for commissions and
field voting sessions. In live mode, those pages show only records created in
the current browser session and explain the limitation. Mock mode provides
complete in-memory lists. Ballot casting is intentionally excluded from this
administrator UI and belongs to the separate voter-facing application.

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
