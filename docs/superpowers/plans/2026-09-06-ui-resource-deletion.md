# Vote Resource Deletion UI Implementation Plan

> **For agentic workers:** Execute inline in the current UI worktree. Do not create commits or dispatch subagents.

**Goal:** Expose the Vote API deletion and commission-member management operations while preserving existing vote records.

**Architecture:** Keep HTTP calls in the vote API clients, mutation/cache wiring in containers, and confirmation presentation in hookless feature UI. Never simulate successful deletion in live mode when the server has no endpoint.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack React Query, Vitest, Testing Library.

**Spec:** User request on 2026-09-06 plus registry management merged from local master `818f6c5`.

## Global Constraints

- Preserve all existing tracked/untracked changes, stashes, and running processes.
- Do not change server source, commit, push, or restart processes.
- Treat elector DELETE as the server-defined soft removal to `BLOCKED`.
- Treat registry DELETE operations as server-defined soft deletion/deactivation.
- Never parse a JSON body from registry management responses because they return 204.

---

### Task 1: Verify deletion contracts

**Files:**
- Inspect: `server/src/modules/elector/presentation/elector/elector.controller.ts`
- Inspect: `server/src/modules/electoral-roll/presentation/electoral-roll/electoral-roll.controller.ts`
- Inspect: `server/src/modules/election-commission/presentation/election-commission/election-commission.controller.ts`

**Interfaces:**
- Consumes: current server routes
- Produces: supported-route matrix used by UI implementation

- [x] Confirm vote elector deletion is `DELETE /votes/:voteId/electors/:electorId` and returns `{ id, voteId, status }`.
- [x] Confirm electoral-roll member deletion is already `DELETE /electoral-rolls/:electoralRollId/members/:memberId`.
- [x] Confirm parent electoral-roll and commission deletion plus commission-member PATCH/DELETE return 204.

### Task 2: Vote elector deletion

**Files:**
- Modify: `ui/src/features/votes/model/vote-operations.types.ts`
- Modify: `ui/src/features/votes/api/vote-operations-api.ts`
- Modify: `ui/src/features/votes/container/elector-management-container.tsx`
- Modify: `ui/src/features/votes/ui/elector-management-view.tsx`
- Create: `ui/src/features/votes/ui/elector-deletion-dialog.tsx`

**Interfaces:**
- Consumes: `DeleteElectorInput { voteId, electorId }`
- Produces: `ManageElectorResult { id, voteId, status: 'BLOCKED' }`

- [x] Add mock/live delete API behavior using the encoded nested endpoint.
- [x] Add a per-elector deletion action that is disabled for snapshot-managed or already blocked electors.
- [x] Require explicit confirmation explaining the irreversible blocked state.
- [x] Invalidate elector and vote query caches after success and show a Korean status message.

### Task 3: Registry and commission-member management

**Files:**
- Modify: `ui/src/features/votes/model/electoral-roll.types.ts`
- Modify: `ui/src/features/votes/model/vote-operations.types.ts`
- Modify: `ui/src/features/votes/api/electoral-roll-api.ts`
- Modify: `ui/src/features/votes/api/vote-operations-api.ts`
- Modify: `ui/src/features/votes/container/electoral-roll-management-container.tsx`
- Modify: `ui/src/features/votes/container/commission-management-container.tsx`
- Modify: `ui/src/features/votes/ui/electoral-roll-management.tsx`
- Modify: `ui/src/features/votes/ui/commission-management.tsx`
- Create: `ui/src/features/votes/ui/registry-deletion-dialog.tsx`

- [x] Add parent electoral-roll deletion with explicit confirmation and cache invalidation.
- [x] Add commission deletion with explicit confirmation and cache invalidation.
- [x] Add commission-member name/role editing and deactivation actions.
- [x] Preserve 403 and 409 failures as accessible, user-friendly messages.

### Task 4: Regression coverage and handoff

**Files:**
- Modify: `ui/test/features/votes/api/vote-operations-api.test.ts`
- Modify: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**
- Consumes: deletion API and confirmation UI
- Produces: request, state, and cache-flow coverage

- [x] Assert DELETE uses encoded vote/elector IDs with no body.
- [x] Assert cancel leaves the elector eligible and confirm transitions it to blocked.
- [x] Assert snapshot-managed electors cannot be individually deleted.
- [x] Assert registry management uses the documented 204 endpoints and request bodies.
- [x] Run full UI tests, lint, typecheck, build, and `git diff --check`.
- [x] Report that live registry verification is blocked until Migration20260906010000 is applied.
