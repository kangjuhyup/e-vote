# UI Electoral Roll Contract Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize the UI workspace with `master@bc4ca33` and align electoral-roll and vote-attachment requests with the commission-decoupled server contract.

**Architecture:** Keep HTTP transport and mock behavior in the votes feature API layer, asynchronous state in the existing React Query containers, and hookless presentation in feature UI files. Electoral rolls become user-owned resources without commission fields; vote creation remains commission-owned and attaches the selected roll through the dedicated PUT endpoint.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack React Query, Vitest, NestJS API contract

**Spec:** `docs/api/electoral-rolls.md`

## Global Constraints

- Preserve every existing uncommitted UI/auth/dev change and every stash entry.
- Do not add or call a snapshot POST API.
- `PUT /votes/:voteId/electoral-roll-snapshot` sends only `{ "electoralRollId": string }`.
- Invalid UUID path identifiers return 400 and UI errors must retain actionable server feedback.
- Do not commit, push, open a PR, or merge beyond bringing the existing `master` commits into this worktree.

---

### Task 1: Safely synchronize master

**Files:**

- Preserve: all tracked and untracked worktree files
- Integrate: `master@bc4ca33`

**Interfaces:**

- Consumes: current dirty `UI초기설정` worktree and existing stash list
- Produces: `HEAD == master` with the pre-sync dirty state restored

- [ ] Record HEAD, dirty paths, and stash identities.
- [ ] Save tracked and untracked changes in a named safety stash.
- [ ] Fast-forward the branch to `master@bc4ca33`.
- [ ] Apply the safety stash without dropping it and verify there are no unmerged files.

### Task 2: Align electoral-roll models and transport

**Files:**

- Modify: `ui/src/features/votes/model/electoral-roll.types.ts`
- Modify: `ui/src/features/votes/api/electoral-roll-api.ts`
- Modify: `ui/src/features/votes/api/electoral-roll-fixtures.ts`
- Test: `ui/test/features/votes/api/electoral-roll-api.test.ts`

**Interfaces:**

- Consumes: list/detail/create envelopes documented in `docs/api/electoral-rolls.md`
- Produces: commission-free `ElectoralRollRecord`, `ElectoralRollPageItemRecord`, `ElectoralRollPageInput`, `CreateElectoralRollInput`, and `CreateElectoralRollResult`

- [ ] Update tests so create sends `{ name }`, list never sends `commissionId`, and response records contain no commission field.
- [ ] Update tests for revision 1 snapshot creation and one automatic snapshot per successful member mutation in mock mode.
- [ ] Remove `commissionId` from the electoral-roll types, live query construction, response mapping, and fixtures.
- [ ] Keep mock snapshot creation internal; expose no snapshot creation request method.
- [ ] Run the electoral-roll API tests.

### Task 3: Remove commission ownership from electoral-roll UI

**Files:**

- Modify: `ui/src/features/votes/ui/electoral-roll-management.tsx`
- Modify: `ui/src/features/votes/ui/electoral-roll-list.tsx`
- Modify: `ui/src/features/votes/container/electoral-roll-management-container.tsx`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**

- Consumes: commission-free electoral-roll view models from Task 2
- Produces: a name-only creation form, commission-free list table, and commission-free detail summary

- [ ] Update UI tests to reject any visible commission-ID field or column on the electoral-roll page.
- [ ] Submit only `{ name: String(data.get("name") ?? "") }` from the container.
- [ ] Remove the commission field from the creation form, list column, and detail summary while preserving table pagination and member management.
- [ ] Run the electoral-roll page tests.

### Task 4: Use the dedicated vote attachment endpoint

**Files:**

- Modify: `ui/src/features/votes/model/vote-operations.types.ts`
- Modify: `ui/src/features/votes/api/vote-operations-api.ts`
- Modify: `ui/src/features/votes/container/vote-setup-container.tsx` if orchestration is kept outside the client
- Test: `ui/test/features/votes/api/vote-operations-api.test.ts`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**

- Consumes: vote POST contract plus `PUT /votes/:voteId/electoral-roll-snapshot`
- Produces: a create flow whose POST body contains vote fields only and whose PUT body is exactly `{ electoralRollId }`

- [ ] Add a failing transport test that inspects both requests and rejects `commissionId`, snapshot IDs, or extra fields in the attachment body.
- [ ] Update mock behavior to resolve or create the current revision snapshot internally and materialize its members without a snapshot POST call.
- [ ] Update live behavior to create the vote first and then attach the selected roll through PUT.
- [ ] Preserve the setup wizard result needed by later sub-vote and billing steps.
- [ ] Run vote-operation and setup-container tests.

### Task 5: Preserve actionable UUID validation errors

**Files:**

- Modify: `ui/src/features/votes/api/electoral-roll-api.ts`
- Modify: `ui/src/features/votes/api/vote-operations-api.ts`
- Test: `ui/test/features/votes/api/electoral-roll-api.test.ts`
- Test: `ui/test/features/votes/api/vote-operations-api.test.ts`

**Interfaces:**

- Consumes: server 400 error envelope
- Produces: thrown `Error` messages that identify invalid request identifiers without exposing tokens or request secrets

- [ ] Add 400-response tests using malformed UUID path identifiers and a safe server validation message.
- [ ] Parse the safe message from the error envelope with a status-based fallback.
- [ ] Confirm containers render the propagated error through their existing alert surfaces.

### Task 6: Verify the integrated workspace

**Files:**

- Verify: all files changed above plus existing dirty auth/dev files

**Interfaces:**

- Consumes: completed contract changes
- Produces: evidence for tests, lint, typecheck/build, and live API integration

- [ ] Run focused electoral-roll and vote-operation tests.
- [ ] Run the full UI test suite.
- [ ] Run UI lint, TypeScript checking, and production build.
- [ ] Apply the new server migration through the existing development migration command.
- [ ] Verify authenticated list/create/detail/member mutation and vote attachment behavior without printing tokens or secrets.
- [ ] Report the exact changed files, preserved backup stash, and command results without committing.
