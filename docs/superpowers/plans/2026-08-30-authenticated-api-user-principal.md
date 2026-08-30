# Authenticated API User Principal Implementation Plan

> **For agentic workers:** Execute inline under the repository `AGENTS.md` policy. Do not delegate unless the user explicitly requests delegation.

**Goal:** Require every business HTTP endpoint to receive the validated request actor through `@User() user: UserPrincipal`, while keeping health endpoints public.

**Architecture:** Authentication infrastructure remains responsible for validating credentials and assigning a `UserPrincipal` to `request.user`. Module presentation controllers consume that validated principal through the shared `@User()` parameter decorator; commands and queries remain transport-independent until an explicit authorization or audit policy needs actor data.

**Tech Stack:** NestJS, TypeScript, Jest

**Spec:** User request from 2026-08-30 and the existing `server/src/shared/application/security/user-principal.ts` contract.

## Global Constraints

- Apply `@User()` to every route handler under `server/src/modules/**/presentation`.
- Do not apply authentication principal injection to root liveness/readiness endpoints.
- Do not infer roles or add authorization rules that the user has not defined.
- Do not accept plain objects as authenticated principals; the shared decorator continues to require a validated `UserPrincipal` instance.
- Keep commands, queries, domain models, and persistence schemas unchanged in this step.

---

### Task 1: Protect module HTTP endpoints with the request principal

**Files:**

- Modify: every `*.controller.ts` under `server/src/modules/**/presentation`
- Use: `server/src/shared/application/security/user-principal.ts`
- Use: `server/src/shared/presentation/common/decorator/user.decorator.ts`

**Interfaces:**

- Consumes: `@User() user: UserPrincipal`
- Produces: route handlers that reject requests without a validated principal before controller execution

- [x] Import `UserPrincipal` and `User` into each business controller.
- [x] Add `@User() user: UserPrincipal` as the first argument of all 52 business route methods.
- [x] Keep existing command/query inputs and public response shapes unchanged.

### Task 2: Update controller contract tests

**Files:**

- Modify: controller specs under `server/test/presentation/route`
- Modify: `server/test/presentation/common/user.decorator.spec.ts`

**Interfaces:**

- Consumes: a shared test principal created only through `UserPrincipal.of()`
- Produces: coverage for principal injection on module route handlers and 401 rejection when the principal is absent

- [x] Pass a validated `UserPrincipal` into every directly invoked controller route method.
- [x] Add a convention assertion that every module controller route parameter list contains `@User()`.
- [x] Run presentation and architecture tests with Node from `.nvmrc`.

### Task 3: Verify and integrate

**Files:**

- Verify: all server sources and tests

**Interfaces:**

- Produces: a buildable, formatted, committed change on both `서버` and `master`

- [ ] Run the complete Jest suite.
- [ ] Run Nest build, ESLint, Prettier check, and `git diff --check`.
- [x] Commit the plan separately from implementation.
- [ ] Commit the implementation and fast-forward `master` without changing unrelated local files.
