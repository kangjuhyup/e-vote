# Master Mock Payment Sync Implementation Plan

> **For agentic workers:** Execute inline in the current worktree. Preserve every tracked/untracked change and all running processes. Do not reset, checkout, clean, stop, restart, push, open a PR, or create an extra commit.

**Goal:** Safely merge local master `b720e7a3f515a0d3803f951b85270b85050be87b`, restore the dirty UI state, and make the existing billing UI follow asynchronous mock payment and refund transitions.

**Architecture:** Protect the complete dirty worktree in one uniquely identified stash, merge only the verified local master, then restore and verify the exact stash contents. Keep server state in React Query: poll billing-order GET only while its status can still advance asynchronously, stop at terminal states, and reuse the same order cache from creation and cancellation flows.

**Tech Stack:** Git, Next.js, React, TanStack React Query, TypeScript, Vitest, pnpm.

**Spec:** User-provided mock billing contract dated 2026-09-05; server feature `511bdbb6280ccee1f5cf8f29551183ef3122c2a1`; local master merge `b720e7a3f515a0d3803f951b85270b85050be87b`.

## Global Constraints

- Preserve all existing tracked and untracked files.
- Do not terminate or manually restart UI, server, or Auth processes.
- Use local `master` only; do not pull or push.
- Keep vote-creator and billing-order-owner authorization server-controlled.
- Do not expose tokens, secrets, payment data, or database credentials.
- Do not create any commit beyond the merge commit produced by the requested merge.

---

### Task 1: Protect and merge the worktree

**Files:** Git worktree and index only.

**Interfaces:** Consumes current branch state and verified local master; produces a merge commit with the prior dirty state restored.

- [x] Record branch, HEAD, local master, feature ancestry, stash list, dirty paths, and listener PIDs.
- [x] Stash tracked and untracked changes with a unique message and verify the worktree is clean.
- [x] Merge local master only after its SHA equals `b720e7a3f515a0d3803f951b85270b85050be87b`.
- [x] Apply the exact new stash, resolve any conflict while retaining both intents, verify all stashed paths, and drop only that stash.

### Task 2: Align asynchronous billing state

**Files:**
- Inspect: `server/src/modules/billing/**`
- Inspect/modify: `ui/src/features/billing/api/billing-query-options.ts`
- Inspect/modify: `ui/src/features/billing/container/billing-order-container.tsx`
- Inspect/modify: `ui/src/features/votes/container/vote-setup-container.tsx`
- Inspect/modify: `ui/src/features/votes/container/vote-edit-container.tsx`
- Test: `ui/test/features/billing/**`

**Interfaces:** `billingOrderQueryOptions(id)` supplies server-owned order state and polls every 500 ms only for `PENDING_PAYMENT` or `REFUND_PENDING`. Mutation success writes the returned order to that query cache so navigation and polling converge on GET state.

- [x] Compare actual status transitions, response codes, and endpoint bodies with UI types and API tests.
- [x] Add focused tests covering polling continuation for `PENDING_PAYMENT`/`REFUND_PENDING` and polling stop for terminal states.
- [x] Implement the smallest query/container changes needed to show `PAID` and `REFUNDED` without duplicating server state locally.
- [x] Confirm 403 handling remains based on vote creator and order owner, not commission membership.

### Task 3: Verify and report

**Files:** Changed billing UI/test files and merge result.

**Interfaces:** Produces fresh focused/full test, lint, typecheck, build, Git integrity, process, and live-flow evidence.

- [x] Run focused billing tests, all UI tests, lint, `tsc --noEmit`, and production build after `nvm use`.
- [x] Exercise the running UI/API read-only where possible without restarting processes or exposing credentials.
- [x] Verify `git diff --check`, no unresolved paths, master/feature ancestry, restored dirty state, current listeners, and report any blocker.
