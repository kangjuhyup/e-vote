# UI OIDC NextAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the Next.js UI workspace to the tenant-scoped OIDC auth server using NextAuth/Auth.js with `client_id=e-vote`.

**Architecture:** Auth.js configuration and OIDC issuer utilities live in `ui/src/shared/auth`. App Router exposes the Auth.js handler from `ui/src/app/api/auth/[...nextauth]/route.ts`, and `ui/src/app/page.tsx` gates the dashboard by calling `auth()` server-side. Auth-related React components live in `ui/src/components/auth`; feature folders remain logic-only.

**Tech Stack:** Next.js `16.3.0`, React `19.2.8`, NextAuth/Auth.js `5.0.0-beta.32`, Vitest `4.1.10`, TypeScript `5.9.3`, Node 24.

## Global Constraints

- Use `client_id=e-vote`.
- Derive issuer as `{AUTH_OIDC_ISSUER}/t/{AUTH_OIDC_TENANT_CODE}/oidc`.
- Use Authorization Code + PKCE with `openid profile email`.
- Keep every React component declaration under `ui/src/components`.
- Do not create `.tsx` files under `ui/src/features`.
- Do not store raw access tokens, refresh tokens, authorization codes, or id tokens in client-rendered session data.
- Verify with `pnpm --filter @vote/ui test`, `pnpm --filter @vote/ui lint`, `pnpm --filter @vote/ui build`, and `pnpm test`.

---

## Files

```text
ui/package.json
ui/.env.example
ui/src/shared/auth/oidc.ts
ui/src/shared/auth/oidc.test.ts
ui/src/shared/auth/auth.ts
ui/src/app/api/auth/[...nextauth]/route.ts
ui/src/app/page.tsx
ui/src/app/providers.tsx
ui/src/components/auth/sign-in-page.tsx
ui/src/components/auth/sign-out-button.tsx
ui/src/components/dashboard/dashboard-page.tsx
README.md
pnpm-lock.yaml
```

### Task 1: Add Dependencies And OIDC Utility

**Files:**
- Modify: `ui/package.json`
- Create: `ui/src/shared/auth/oidc.ts`
- Create: `ui/src/shared/auth/oidc.test.ts`

**Interfaces:**
- Produces: `E_VOTE_PROVIDER_ID = "e-vote"`.
- Produces: `E_VOTE_CLIENT_ID = "e-vote"`.
- Produces: `buildTenantOidcIssuer({ issuerOrigin, tenantCode }): string`.
- Produces: `getTenantOidcIssuer(): string`.

- [ ] **Step 1: Add the failing issuer test**

Create `ui/src/shared/auth/oidc.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildTenantOidcIssuer } from "./oidc";

describe("buildTenantOidcIssuer", () => {
  it("builds a tenant-scoped OIDC issuer from an origin and tenant code", () => {
    expect(
      buildTenantOidcIssuer({
        issuerOrigin: "http://localhost:3000/",
        tenantCode: "acme",
      }),
    ).toBe("http://localhost:3000/t/acme/oidc");
  });

  it("encodes tenant codes when composing the issuer path", () => {
    expect(
      buildTenantOidcIssuer({
        issuerOrigin: "https://auth.example.com",
        tenantCode: "tenant one",
      }),
    ).toBe("https://auth.example.com/t/tenant%20one/oidc");
  });
});
```

- [ ] **Step 2: Add UI test script and dependencies**

Add to `ui/package.json`:

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "next-auth": "5.0.0-beta.32"
  },
  "devDependencies": {
    "vitest": "4.1.10"
  }
}
```

- [ ] **Step 3: Run the focused test and confirm RED**

Run:

```bash
pnpm --filter @vote/ui test -- oidc.test.ts
```

Expected: fails because `./oidc` does not exist.

- [ ] **Step 4: Add the issuer utility**

Create `ui/src/shared/auth/oidc.ts` with constants and issuer builders.

- [ ] **Step 5: Run the focused test and confirm GREEN**

Run:

```bash
pnpm --filter @vote/ui test -- oidc.test.ts
```

Expected: passes.

### Task 2: Add Auth.js Server Integration

**Files:**
- Create: `ui/src/shared/auth/auth.ts`
- Create: `ui/src/app/api/auth/[...nextauth]/route.ts`
- Create: `ui/.env.example`

**Interfaces:**
- Consumes: `getTenantOidcIssuer`, `E_VOTE_PROVIDER_ID`, `E_VOTE_CLIENT_ID`.
- Produces: Auth.js `handlers`, `auth`, `signIn`, `signOut`.
- Produces: App Router `GET` and `POST` handlers.

- [ ] **Step 1: Add Auth.js config**

Create `ui/src/shared/auth/auth.ts` using `NextAuth` with custom OIDC provider `e-vote`, issuer from `getTenantOidcIssuer()`, PKCE/state/nonce checks, and public-client token endpoint auth method `none`.

- [ ] **Step 2: Add route handler**

Create `ui/src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/shared/auth/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Add environment example**

Create `ui/.env.example` with `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, `AUTH_OIDC_ISSUER`, and `AUTH_OIDC_TENANT_CODE`.

### Task 3: Add Auth UI Components

**Files:**
- Create: `ui/src/components/auth/sign-in-page.tsx`
- Create: `ui/src/components/auth/sign-out-button.tsx`
- Modify: `ui/src/components/dashboard/dashboard-page.tsx`
- Modify: `ui/src/app/page.tsx`

**Interfaces:**
- Produces: `SignInPage`.
- Produces: `SignOutButton`.
- Updates: `DashboardPage({ sessionUser })`.

- [ ] **Step 1: Add sign-in page component**

Create a server component that renders a form action calling `signIn("e-vote")`.

- [ ] **Step 2: Add sign-out button**

Create a client component that calls `signOut()` from `next-auth/react`.

- [ ] **Step 3: Gate the root page**

Update `ui/src/app/page.tsx` to call `auth()` and render sign-in or dashboard.

- [ ] **Step 4: Show authenticated user in dashboard**

Update `DashboardPage` to accept a serializable `sessionUser` prop and render it with `SignOutButton`.

### Task 4: Providers, Docs, And Verification

**Files:**
- Modify: `ui/src/app/providers.tsx`
- Modify: `README.md`
- Update: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `SessionProvider`.
- Produces: documented Auth.js env setup and callback URL.

- [ ] **Step 1: Add SessionProvider**

Wrap the existing React Query provider tree in `SessionProvider`.

- [ ] **Step 2: Update README**

Document OIDC env variables and callback URL:

```text
{AUTH_URL}/api/auth/callback/e-vote
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
pnpm install
```

- [ ] **Step 4: Run verification**

Run:

```bash
pnpm --filter @vote/ui test
pnpm --filter @vote/ui lint
pnpm --filter @vote/ui build
pnpm test
```
