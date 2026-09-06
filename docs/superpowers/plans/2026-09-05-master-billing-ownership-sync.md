# Master Billing Ownership Sync Implementation Plan

> **For agentic workers:** Execute inline in the current worktree. Preserve all tracked/untracked changes and running processes. Do not reset, checkout, clean, commit beyond the requested merge, push, open a PR, stop, or restart processes.

**Goal:** Merge local master `d575ee15ffc482ec1dea286579aa21741c73b7dd` safely into `UI초기설정`, restore the dirty UI state, and determine whether the billing ownership/outbox contract requires a minimal UI adjustment.

**Architecture:** Protect the current dirty worktree with one uniquely named stash including untracked files, merge only the verified local master, restore the stash, and resolve overlaps by retaining both master and UI intent. Audit the actual billing request/response DTOs and authorization errors against the UI API/container boundary; change UI code only if the public contract changed.

**Tech Stack:** Git, NestJS server source, Next.js, React Query, TypeScript, Vitest, pnpm.

**Spec:** User-provided billing ownership contract dated 2026-09-05; server commit `fe328d4a383162cd1c1803a5e51c915e549300d0`; master merge `d575ee15ffc482ec1dea286579aa21741c73b7dd`.

## Global Constraints

- Preserve every existing tracked and untracked worktree change.
- Preserve running UI, server, and Auth processes without stop or restart operations.
- Treat local master as the only synchronization source; do not pull or push.
- Do not expose access tokens, secrets, identity data, or database credentials.
- Make no UI change unless comparison with the actual merged server contract requires it.
- Do not commit except for the merge commit produced by the explicitly requested `git merge`.

---

### Task 1: Verify and merge local master

**Files:** Git worktree/index only.

**Interfaces:** Consumes the current `UI초기설정` HEAD and local `master`; produces a merge commit with the pre-existing dirty state restored.

- [x] Record HEAD, branch, porcelain status, stash list, local master SHA, and feature-commit ancestry.
- [x] Stash tracked and untracked changes under a unique message and verify a clean worktree.
- [x] Merge local master only when it equals `d575ee15ffc482ec1dea286579aa21741c73b7dd`.
- [x] Apply the exact new stash, resolve conflicts without discarding either side, verify all stashed paths are restored, then drop only that stash.

### Task 2: Audit billing ownership and migration contract

**Files:**
- Inspect: `server/src/modules/billing/**`
- Inspect: `server/src/modules/vote/**`
- Inspect: `server/src/platform/database/migration/Migration20260902010000.ts`
- Inspect: `server/src/platform/database/migration/Migration20260905000000.ts`
- Inspect/Modify only if required: `ui/src/features/billing/api/billing-api.ts`
- Inspect/Modify only if required: `ui/src/features/billing/container/**`
- Inspect/Modify only if required: `ui/src/features/billing/model/**`

**Interfaces:** Verify that UI requests rely on authenticated server identity, do not send or infer owner fields, and present 403 failures without claiming commission membership grants payment authority.

- [x] Read actual create/retry/read/cancel DTOs, controllers, handlers, error mappers, and migration definitions.
- [x] Compare endpoint paths, bodies, response fields, and 403 behavior with UI API/types/fixtures/error rendering.
- [x] Add a focused regression test and minimal UI-only adjustment only when a mismatch is confirmed.

### Task 3: Verify integration state

**Files:** UI code/tests and resolved conflict files only.

**Interfaces:** Produces fresh Git, process-preservation, test, lint, typecheck, and build evidence.

- [x] Inspect listener/process state read-only and confirm no stop/restart command was issued.
- [x] Run focused billing tests plus full UI tests, lint, `tsc --noEmit`, and build after `nvm use`.
- [x] Run `git diff --check`, verify no unresolved paths, verify both migrations are present in HEAD, and report final HEAD, conflicts, contract impact, and blockers.
