# UI OIDC Refresh Token Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh expired Vote API access tokens without exposing credentials to the browser session, and return users to the login screen when authentication cannot be recovered.

**Architecture:** The local auth bootstrap enables the OIDC `offline_access` scope and keeps the `e-vote` client configuration idempotent. Auth.js stores access and rotating refresh tokens only in its encrypted HttpOnly JWT, performs refresh-token exchange from the server-side JWT callback, and exposes only a coarse auth status to `SessionProvider`. A live-mode session boundary refreshes before mounting React Query consumers; Vote API 401 responses emit a local auth-required event that signs out and navigates to the login page.

**Tech Stack:** Next.js 16, Auth.js 5 beta, React 19, TanStack Query, Vitest, Node test runner, Docker Compose OIDC bootstrap.

**Spec:** User feedback on `/`: implement refresh-token renewal and replace unrecoverable API-error retry UI with reauthentication.

## Global Constraints

- Never expose access tokens or refresh tokens through the client-rendered Auth.js session.
- Never log token endpoint payloads or token values.
- Preserve refresh-token rotation by retaining the previous refresh token only when a successful token response omits a replacement.
- Repeat the Vote API `resource` parameter during refresh so the replacement opaque access token retains its audience.
- Revoke the refresh token with the public `e-vote` client before local sign-out and continue through the tenant end-session endpoint.
- Refresh only in the Auth.js JWT update flow, before Vote API query components mount.
- Keep feature API clients injectable for existing unit tests.
- Keep all tests under `ui/test`; keep reusable auth transport under `ui/src/shared/auth`.

---

### Task 1: Enable refresh-token issuance in local OIDC bootstrap

**Files:**
- Modify: `scripts/bootstrap-auth-client.mjs`
- Test: `scripts/bootstrap-auth-client.test.mjs`

**Interfaces:**
- Produces `createDesiredClient()` with `scope: "openid profile email offline_access"`.
- Produces an idempotent `offline_access` custom scope before OIDC provider discovery.
- Updates an existing `e-vote` client by its immutable internal `id` when mutable configuration differs.

- [x] Add tests for scope creation, compatible-client reuse, and existing-client update.
- [x] Make bootstrap create `offline_access` when absent, then create/update/reuse the client.
- [x] Run `pnpm test:auth-bootstrap`.

### Task 2: Persist and rotate refresh tokens server-side

**Files:**
- Modify: `ui/src/shared/auth/vote-session-token.ts`
- Create: `ui/src/shared/auth/refresh-vote-access-token.ts`
- Create: `ui/src/shared/auth/revoke-vote-refresh-token.ts`
- Create: `ui/src/shared/auth/vote-logout.ts`
- Modify: `ui/src/shared/auth/auth.ts`
- Test: `ui/test/shared/auth/vote-session-token.test.ts`
- Create: `ui/test/shared/auth/refresh-vote-access-token.test.ts`

**Interfaces:**
- `persistVoteAccessToken(token, account)` stores `access_token`, `expires_at`, and `refresh_token` in the encrypted Auth.js JWT.
- `getVoteApiAuthStatus(token, now?)` returns `"ready" | "refresh-required" | "reauth-required"`.
- `refreshVoteAccessToken(token, fetcher?)` posts `grant_type=refresh_token`, `client_id=e-vote`, and the stored refresh token to the tenant token endpoint and returns a rotated JWT payload.
- Auth.js `jwt` refreshes only for `trigger === "update"` with `{ refreshVoteAccessToken: true }`; `session` exposes only `voteApiAuthStatus`.

- [x] Add failing token persistence/status tests and token-endpoint contract tests.
- [x] Implement token persistence, status mapping, refresh exchange, audience retention, and fail-closed cleanup.
- [x] Wire Auth.js callbacks, ID-token profile claims, `offline_access`, refresh-token revocation, and OIDC end-session logout.
- [x] Run the focused auth tests.

### Task 3: Gate queries and centralize unrecoverable 401 handling

**Files:**
- Create: `ui/src/shared/auth/vote-api-auth-events.ts`
- Create: `ui/src/shared/auth/vote-api-fetch.ts`
- Modify: `ui/src/app/providers.tsx`
- Modify: `ui/src/features/votes/api/votes-api.ts`
- Modify: `ui/src/features/votes/api/electoral-roll-api.ts`
- Modify: `ui/src/features/votes/api/vote-operations-api.ts`
- Modify: `ui/src/features/votes/api/vote-sms-api.ts`
- Modify: `ui/src/features/billing/api/billing-api.ts`
- Test: `ui/test/shared/auth/vote-api-fetch.test.ts`
- Modify: `ui/test/app/providers.test.tsx`

**Interfaces:**
- `voteApiFetch(input, init)` delegates to `fetch` and emits `vote-api-auth-required` on status 401.
- Live default API clients use `voteApiFetch`; explicitly injected fetchers remain unchanged.
- `Providers` waits for the Auth.js session, calls `update({ refreshVoteAccessToken: true })` when required, and signs out with redirect to `/` on refresh failure or the auth-required event.

- [x] Add failing event/fetch and provider refresh/reauth tests.
- [x] Implement the shared fetch/event boundary and replace live default fetchers.
- [x] Implement the provider gate without rendering feature query children during refresh.
- [x] Run focused UI tests.

### Task 4: Verify the complete flow

**Files:**
- Modify if needed: `ui/.env.example`, `README.md`

- [x] Run `pnpm test:auth-bootstrap`.
- [x] Run `pnpm --filter @vote/ui test`.
- [x] Run `pnpm --filter @vote/ui lint`.
- [x] Run `pnpm --filter @vote/ui exec tsc --noEmit`.
- [x] Run `pnpm --filter @vote/ui build`.
- [x] Re-run the local auth bootstrap so discovery advertises `offline_access` and `refresh_token`.
- [x] Confirm login callback, authenticated Vote API access, audience retention after refresh, revocation, and OIDC logout against the pinned auth-service image.
