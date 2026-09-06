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
# payment outbox worker, and the vote UI as separate processes
pnpm dev
```

When run inside Orca, `pnpm dev` opens four independent terminal tabs for the
Vote API, Vote UI, Auth Service, and Auth UI. PostgreSQL and Redis continue in
the background. Database migrations run before those terminals open. Outside
Orca, the API and UI keep running in the current terminal as before.

The default local ports are `5432` for PostgreSQL, `6381` for Redis, `3000`
for the API server, `3001` for the vote UI, `3002` for the OIDC auth service,
and `3003` for the auth admin UI.

Swagger UI is available at <http://localhost:3000/docs>, and the OpenAPI JSON
document at <http://localhost:3000/docs-json>. Use the Swagger UI `Authorize`
action to provide the Bearer access token required by protected API routes.

For the development participant authentication and voting flow, see
[Mock participant authentication](docs/participant-mock-authentication.md).

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

# payment outbox and vote schedule worker development mode
pnpm start:worker:dev

# payment outbox and vote schedule worker production mode
pnpm start:worker:prod
```

The API and background worker are independent process entrypoints. The worker
dispatches payment outbox messages and automatically changes a paid
`FINALIZED` vote to `OPEN` when `startedAt` is reached, then changes it to
`CLOSED` when `endedAt` is reached. Scale
only the API deployment with an HPA by running `start:prod`; run
`start:worker:prod` in a separate worker deployment with its own replica
policy. Increasing API replicas never creates additional polling loops.

Worker delivery remains at-least-once. More than one worker replica can safely
claim different messages through PostgreSQL leases and `FOR UPDATE SKIP
LOCKED`, but worker concurrency must be scaled independently from HTTP load.

`POST /votes` and `PATCH /votes/:voteId` accept optional ISO 8601 `startedAt`
and `endedAt` fields. Automatic transitions require an explicit positive window
(`endedAt > startedAt`). A create request that omits the schedule retains the
legacy zero-length window and is not auto-transitioned; an update that omits
either field preserves its stored value. Payment completion finalizes the vote
but does not open it early—the worker owns the time-based transition.

### Server APIs

- [선거인명부 목록 API](docs/api/electoral-rolls.md)
- [SMS notification API](docs/api/sms-notifications.md): vote reminder, result, upcoming, and field-session SMS commands with a random development Adapter. No real SMS provider is called.
- [투표 이용료 Billing API](docs/api/billing.md)

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

### Vote API personal-data encryption

Set `PERSONAL_DATA_ENCRYPTION_SECRET` to a stable secret of at least 32
characters whenever the Vote API is started outside the test environment.
`pnpm dev` supplies a local-only default. The value encrypts electoral-roll
identity fields and keys their matching hashes, so changing it requires an
explicit data re-encryption and re-hashing migration.

### UI OIDC Auth

```bash
cp ui/.env.example ui/.env.local
```

`pnpm dev` supplies local defaults for `AUTH_SECRET`, `AUTH_URL`,
`AUTH_OIDC_ISSUER`, and `AUTH_OIDC_TENANT_CODE`. When running the UI alone,
copy the example file and replace `AUTH_SECRET` with a generated value. Update
the issuer and tenant code for non-local environments. The configured issuer becomes
`{AUTH_OIDC_ISSUER}/t/{AUTH_OIDC_TENANT_CODE}/oidc`. If the registered
client is confidential, also set `AUTH_E_VOTE_SECRET`. `AUTH_E_VOTE_RESOURCE`
identifies the Vote API resource and defaults to `https://vote-api.example.com`.

Register this redirect URI in the OIDC auth server:

```text
{AUTH_URL}/api/auth/callback/e-vote
```

The local Compose bootstrap registers
`http://localhost:3001/api/auth/callback/e-vote` and the
`https://vote-api.example.com` allowed resource on the public `e-vote` client. It
also registers a `vote-api` service client using `client_secret_basic` and the
same value in `introspectionResources`. Override these values with
`AUTH_CLIENT_REDIRECT_URI`, `AUTH_CLIENT_ALLOWED_RESOURCE`,
`AUTH_RESOURCE_SERVER_CLIENT_ID`, and `AUTH_RESOURCE_SERVER_CLIENT_SECRET`.

After login, the UI stores the OIDC access token only inside the encrypted
Auth.js JWT session cookie. The server-side `/api/vote-server/*` route reads
that cookie and forwards the token to the Vote API as a Bearer token. It is not
added to the browser-visible session object.

The UI requests `offline_access` and keeps rotating refresh tokens in the same
encrypted server-side session. Refresh requests repeat the Vote API `resource`
parameter so replacement opaque access tokens retain the configured audience.
Signing out revokes the refresh token before clearing the Auth.js session, then
continues through the tenant OIDC end-session endpoint.

The Vote API treats the access token as opaque. It authenticates as a
confidential resource server and sends the token to the tenant's RFC 7662
introspection endpoint. A `UserPrincipal` is assigned to `request.user` only
when the response has `active=true`, non-empty `sub` and `tenant_id`, the exact
issuer and Vote API audience, and an unexpired `exp`. A future `nbf` is also
rejected.

Local development uses this contract:

```text
issuer                = {AUTH_OIDC_ISSUER}/t/{AUTH_OIDC_TENANT_CODE}/oidc
introspection         = {issuer}/token/introspection
audience/resource     = https://vote-api.example.com
resource server ID    = vote-api
resource server secret= vote-local-introspection-secret-change-me
```

The auth server must expose `POST application/x-www-form-urlencoded`
introspection using `client_secret_basic`, register the Vote API credentials,
and return at least `active`, `client_id`, `token_type`, `scope`, `iss`, `aud`,
`exp`, `iat`, `tenant_id`, and `sub` for user tokens. The stable `tenant_id`
and `sub` values populate `UserPrincipal`; profile attributes and role
assignments are intentionally not required from introspection.

For deployments, configure `VOTE_AUTH_INTROSPECTION_CLIENT_SECRET` and
optionally override `VOTE_AUTH_ISSUER`, `VOTE_AUTH_INTROSPECTION_URI`,
`VOTE_AUTH_AUDIENCE`, `VOTE_AUTH_INTROSPECTION_CLIENT_ID`, and
`VOTE_AUTH_INTROSPECTION_TIMEOUT_MS` (default `3000`). Use HTTPS for the issuer
and introspection endpoint. Invalid or inactive tokens return 401; an
unreachable or invalid introspection service response returns 503. Do not use
the public `e-vote` UI client credentials for introspection.

### UI Mock Mode

Set `NEXT_PUBLIC_VOTE_API_MODE=mock` or run `pnpm dev:ui:mock`. In mock mode,
the UI reads local vote fixtures, does not call the configured vote API,
does not call the authenticated `/api/vote-server` route, and uses a local `Mock 관리자`
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

The current server exposes list APIs for commissions, electoral rolls, and
field voting sessions. Ballot casting is intentionally excluded from this
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
