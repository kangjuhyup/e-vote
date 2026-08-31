# Opaque Access Token Introspection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace local JWT access-token verification with authenticated RFC 7662 introspection and continue assigning a validated `UserPrincipal` to authenticated requests.

**Architecture:** Keep `AuthenticatedUserGuard` behind `AccessTokenVerifierPort`. Platform authentication performs the external introspection call, validates the token's active state and Vote API binding, and maps normalized claims to `UserPrincipal`; the Guard only maps invalid tokens to 401 and provider outages to 503.

**Tech Stack:** NestJS 11, TypeScript 5, Node.js 24 `fetch`, Jest 30

**Spec:** User-approved contract in the 2026-08-31 conversation: the auth server exposes RFC 7662 introspection for opaque access tokens.

## Global Constraints

- Use `POST application/x-www-form-urlencoded` and `client_secret_basic` for introspection.
- Never log or persist access tokens or introspection credentials.
- Require `active=true`, exact issuer, HTTPS Vote API audience, unexpired `exp`, non-empty `tenant_id`, and non-empty `sub` before creating `UserPrincipal`.
- External auth I/O stays in platform infrastructure and outside database transactions.
- Initialize backend-created DTO/result classes through `static of()`.

---

### Task 1: Authentication contract and configuration

**Files:**

- Modify: `server/src/shared/application/port/security/access-token-verifier.port.ts`
- Modify: `server/src/platform/authentication/oidc-authentication.config.ts`
- Test: `server/test/platform/authentication/oidc-authentication.config.spec.ts`

**Interfaces:**

- Produces: `InvalidAccessTokenError`, `AccessTokenVerificationUnavailableError`
- Produces: `OidcAuthenticationConfig` fields `introspectionUri`, `audience`, `introspectionClientId`, `introspectionClientSecret`, `timeoutMs`

- [x] Add focused configuration tests for derived and explicit introspection settings.
- [x] Add application-boundary verification errors without HTTP or platform imports.
- [x] Replace JWKS configuration with validated introspection endpoint and confidential-client settings.
- [x] Run `pnpm test -- --runInBand test/platform/authentication/oidc-authentication.config.spec.ts`.

### Task 2: RFC 7662 client and response normalization

**Files:**

- Create: `server/src/platform/authentication/oidc-introspect-token.result.ts`
- Create: `server/src/platform/authentication/oidc-token-introspector.ts`
- Delete: `server/src/platform/authentication/oidc-jwt-verifier.ts`
- Test: `server/test/platform/authentication/oidc-token-introspector.spec.ts`

**Interfaces:**

- Produces: `OidcIntrospectTokenResult.of(payload: unknown)`
- Produces: `OidcTokenIntrospector = (accessToken: string) => Promise<OidcIntrospectTokenResult>`
- Produces: `createOidcTokenIntrospector(config, fetchImpl?)`

- [x] Test POST encoding, Basic authentication, normalized claims, inactive tokens, audience/issuer/expiry rejection, malformed responses, HTTP failures, and network failures.
- [x] Implement strict unknown-JSON normalization via `OidcIntrospectTokenResult.of()`.
- [x] Implement the timeout-bounded introspection client without logging token material.
- [x] Run the focused introspector test.

### Task 3: Principal mapping, Guard behavior, and Nest wiring

**Files:**

- Modify: `server/src/platform/authentication/oidc-access-token-verifier.adapter.ts`
- Modify: `server/src/platform/authentication/authentication.module.ts`
- Modify: `server/src/shared/presentation/common/guard/authenticated-user.guard.ts`
- Test: `server/test/platform/authentication/oidc-access-token-verifier.adapter.spec.ts`
- Test: `server/test/shared/presentation/common/guard/authenticated-user.guard.spec.ts`

**Interfaces:**

- Consumes: `OidcTokenIntrospector`
- Produces: the existing `AccessTokenVerifierPort.verify(accessToken): Promise<UserPrincipal>` contract

- [x] Replace JWT payload mocks with introspection results and verify immutable principal mapping.
- [x] Wire `OIDC_TOKEN_INTROSPECTOR` into `AuthenticationModule`.
- [x] Map inactive/invalid tokens to 401 and introspection availability failures to 503 while clearing `request.user`.
- [x] Run focused adapter and Guard tests.

### Task 4: Runtime contract, dependency cleanup, and verification

**Files:**

- Modify: `README.md`
- Modify: `docker-compose.yml`
- Modify: `scripts/dev.sh`
- Modify: `scripts/bootstrap-auth-client.mjs`
- Modify: `scripts/bootstrap-auth-client.test.mjs`
- Modify: `ui/.env.example`
- Modify: `ui/src/shared/auth/oidc.ts`
- Modify: `ui/src/shared/auth/auth.ts`
- Test: `ui/test/shared/auth/oidc.test.ts`
- Modify: `server/test/jest.setup.ts`
- Modify: `server/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Documents: `VOTE_AUTH_INTROSPECTION_URI`, `VOTE_AUTH_AUDIENCE`, `VOTE_AUTH_INTROSPECTION_CLIENT_ID`, `VOTE_AUTH_INTROSPECTION_CLIENT_SECRET`, `VOTE_AUTH_INTROSPECTION_TIMEOUT_MS`

- [x] Document the introspection request, required response claims, credentials, and failure behavior.
- [x] Request the same absolute Vote API `resource` from the UI and register it in the bootstrap client.
- [x] Default local auth access tokens to opaque format.
- [x] Supply isolated test credentials through Jest setup.
- [x] Remove the unused `jose` dependency and update the lockfile.
- [x] Run Node 24 focused tests, the full Jest suite, build, Prettier check, ESLint, and `git diff --check`.
