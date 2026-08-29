# UI OIDC NextAuth Design

## Goal

Connect the `ui` workspace to the OIDC authentication server using NextAuth/Auth.js.

## Scope

- Add Auth.js for the Next.js App Router frontend.
- Configure a custom OIDC provider from the auth documentation.
- Use `client_id=e-vote`.
- Use Authorization Code + PKCE.
- Keep React components under `ui/src/components`.
- Keep feature folders free of React components.
- Do not implement the authentication server.
- Do not add persistence adapters for Auth.js sessions.

## OIDC Server Contract

The auth documentation defines tenant-scoped issuers:

```text
{OIDC_ISSUER}/t/{tenantCode}/oidc
```

The UI derives the provider issuer from environment variables:

```text
AUTH_OIDC_ISSUER=http://localhost:3000
AUTH_OIDC_TENANT_CODE=acme
```

With those values, the issuer becomes:

```text
http://localhost:3000/t/acme/oidc
```

The provider discovery document is expected at:

```text
/t/:tenantCode/oidc/.well-known/openid-configuration
```

The auth server requires Authorization Code + PKCE. The UI requests `openid profile email` and relies on Auth.js to use the discovery metadata for authorization, token, userinfo, and JWKS endpoints.

## Auth.js Integration

Use `next-auth@5.0.0-beta.32`, because current Auth.js Next.js App Router documentation installs `next-auth@beta` and uses an `auth.ts` file plus an App Router route handler.

Auth config lives under:

```text
ui/src/shared/auth/
  auth.ts
  oidc.ts
```

Route handler:

```text
ui/src/app/api/auth/[...nextauth]/route.ts
```

`auth.ts` exports:

- `handlers`
- `auth`
- `signIn`
- `signOut`

Provider config:

- `id`: `e-vote`
- `name`: `E-Vote`
- `type`: `oidc`
- `issuer`: derived from `AUTH_OIDC_ISSUER` and `AUTH_OIDC_TENANT_CODE`
- `clientId`: `e-vote`
- `checks`: `pkce`, `state`, `nonce`
- `scope`: `openid profile email`
- `token_endpoint_auth_method`: `none` unless a client secret is supplied later

The initial implementation assumes a public PKCE client because no client secret was provided.

## UI Behavior

The root route calls `auth()` server-side.

If no session exists, it renders `ui/src/components/auth/sign-in-page.tsx`.

If a session exists, it renders the existing dashboard page and passes a serializable session user summary.

Sign-in uses a server action that calls `signIn("e-vote")`.

Sign-out uses a client component under `ui/src/components/auth/sign-out-button.tsx`.

## Environment

Add `ui/.env.example`:

```text
AUTH_SECRET=
AUTH_URL=http://localhost:3001
AUTH_TRUST_HOST=true
AUTH_OIDC_ISSUER=http://localhost:3000
AUTH_OIDC_TENANT_CODE=acme
```

`AUTH_SECRET` is required by Auth.js. `AUTH_URL` must match the UI origin registered with the OIDC client. The OIDC client must register this callback URL:

```text
{AUTH_URL}/api/auth/callback/e-vote
```

## Testing And Verification

Add a focused unit test for issuer derivation:

```text
ui/src/shared/auth/oidc.test.ts
```

Verification commands:

```bash
pnpm --filter @vote/ui test
pnpm --filter @vote/ui lint
pnpm --filter @vote/ui build
pnpm test
```

## Out Of Scope

- Auth server client registration.
- Database-backed Auth.js session storage.
- Role or permission enforcement.
- Provider-initiated logout customization.
- Token refresh UI behavior.
