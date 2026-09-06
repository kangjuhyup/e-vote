# UI Vote Finalized Contract Sync Implementation Plan

> **For agentic workers:** Execute this plan inline while preserving the current dirty worktree. Do not commit, push, open a PR, or merge anything beyond the explicitly requested local `master` synchronization.

**Goal:** Safely synchronize local master and make the UI represent DRAFT, payment-processing, FINALIZED, REFUND_PENDING, and refunded-editable states consistently.

**Architecture:** Keep raw vote and billing order server state in TanStack Query. Derive one UI-facing lifecycle model from both records, then pass labels and editability into hookless vote views. Billing polling owns transition refresh and invalidates both billing and vote queries when lifecycle-relevant state changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack React Query, Vitest

**Spec:** `docs/api/billing.md` and the server contract merged by `a8d4ea07c734ad55a0a6fb32d90ffa578f7ab64a`

## Global Constraints

- Preserve every tracked and untracked change in the `UI초기설정` worktree.
- Do not stop or restart UI, server, or auth processes.
- Do not modify server files after synchronization.
- Do not commit, push, create a PR, or perform another merge without a new request.

---

### Task 1: Safe master synchronization

**Files:** Git metadata only; restore all pre-existing worktree files after merge.

**Interfaces:**
- Consumes: local `master` at `a8d4ea07c734ad55a0a6fb32d90ffa578f7ab64a`
- Produces: UI branch containing the master merge plus the complete restored dirty state

- [ ] Record status, HEAD, master, merge base, and overlapping paths.
- [ ] Stash tracked and untracked changes with a uniquely named safety stash.
- [ ] Merge local `master` without rewriting history.
- [ ] Apply the safety stash and resolve conflicts by preserving both intents.
- [ ] Retain the safety stash until verification completes.

### Task 2: Vote/billing lifecycle model

**Files:**
- Modify: `ui/src/features/votes/model/vote.types.ts`
- Modify: `ui/src/features/votes/model/vote-operations.types.ts`
- Modify/Create: `ui/src/features/votes/lib/vote-finalization.ts`
- Test: `ui/test/features/votes/lib/vote-finalization.test.ts`

**Interfaces:**
- Consumes: vote status plus optional billing order status
- Produces: labels `초안`, `결제 처리 중`, `확정됨(개시 전)` and a single `canEdit` decision

- [ ] Add FINALIZED to live and operations status unions.
- [ ] Add failing cases for DRAFT+PENDING_PAYMENT, FINALIZED+PAID, FINALIZED+REFUND_PENDING, and DRAFT+REFUNDED.
- [ ] Implement the lifecycle mapper so editability never depends on DRAFT alone.
- [ ] Run the focused lifecycle tests.

### Task 3: Consistent list, detail, and edit UI

**Files:**
- Modify: vote view-model/query/container files identified by status usage under `ui/src/features/votes`
- Modify: billing confirmation and management UI only where state copy or disabled actions require it
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`
- Test: billing container/API tests under `ui/test/features/billing`

**Interfaces:**
- Consumes: lifecycle mapper from Task 2
- Produces: consistent status display and disabled mutation controls across list/detail/edit

- [ ] Add regression assertions for FINALIZED and payment-processing presentation.
- [ ] Wire vote and billing order state into containers without moving server state into Zustand.
- [ ] Disable edit/setup actions while PENDING_PAYMENT, PAID, or REFUND_PENDING locks the vote.
- [ ] Preserve cancellation and re-payment actions for their allowed states.

### Task 4: Polling and invalidation

**Files:**
- Modify: `ui/src/features/billing/api/billing-query-options.ts`
- Modify: billing/vote containers that own mutations and query invalidation
- Test: `ui/test/features/billing/api/billing-query-options.test.ts`

**Interfaces:**
- Consumes: transitional billing states PENDING_PAYMENT and REFUND_PENDING
- Produces: polling until a stable state and synchronized vote list/detail caches

- [ ] Assert polling remains active only for transitional states.
- [ ] Invalidate/refetch vote detail and list when billing status changes to PAID or REFUNDED.
- [ ] Run focused billing and vote container tests.

### Task 5: Verification and handoff

**Files:** No implementation files beyond Tasks 2–4.

**Interfaces:**
- Consumes: final working tree
- Produces: evidence-backed report with merge result, conflicts, files, tests, and runtime blocker

- [ ] Run `git diff --check`.
- [ ] Run all UI tests, lint, TypeScript checking, and production build after `nvm use`.
- [ ] Confirm no server file differs from the synchronized baseline because of UI implementation work.
- [ ] Report whether the currently running server needs a restart for live verification without restarting it.
