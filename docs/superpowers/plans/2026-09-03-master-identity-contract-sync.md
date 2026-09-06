# Master Identity Contract Sync Implementation Plan

> **For agentic workers:** Execute inline in the current worktree. Repository policy and the user's explicit constraints prohibit subagent execution, commits, pushes, PRs, process restarts, destructive reset/checkout/clean operations, and loss of existing dirty changes.

**Goal:** Safely merge local master `3362cc7`, preserve every existing UI worktree change, reconcile the UI identity-profile contract with server commit `469aea8`, and verify the integrated application.

**Architecture:** Protect the dirty UI state with a named Git stash including untracked files, merge the verified local master commit, then restore and resolve only true overlaps while preserving both intents. Compare server DTOs, response views, masking, and attachment validation directly against the UI model/API boundary; make only contract-required UI adjustments. Use existing processes for live checks without restarting or terminating them.

**Tech Stack:** Git, Next.js, React, TypeScript, Vitest, NestJS server source, curl, pnpm.

**Spec:** User-provided synchronization request dated 2026-09-03; server commits `469aea8` and `3362cc7`.

## Global Constraints

- Preserve all existing tracked and untracked worktree changes.
- Do not run reset, checkout, clean, pull, push, commit, PR, or process stop/restart commands.
- Treat local `master` as source of truth and require its tip to equal `3362cc7` before merging.
- Do not print raw identity data, tokens, secrets, database URLs, or passwords.
- Do not modify server code while reconciling the UI.

---

### Task 1: Snapshot and merge local master

**Files:** Git index/worktree only; no content edits planned.

**Interfaces:** Consumes current `UI초기설정` branch and local `master`; produces a merge commit in the branch plus a fully restored dirty worktree.

- [x] Record branch, HEAD, porcelain status, local master SHA, target commit ancestry, and current stashes.
- [x] Create one named stash with `--include-untracked` so tracked and untracked user changes are protected.
- [x] Merge local `master` using `git merge --no-edit master` only after confirming `master == 3362cc7`.
- [x] Restore the named stash with `git stash apply`, retain it until restoration and conflict checks pass, then drop only that exact stash entry.
- [x] Resolve conflicts by comparing base/master/stashed UI intent; stage only conflict resolutions required to complete restoration and leave all user changes present.

### Task 2: Reconcile UI and server contracts

**Files:**
- Inspect: `server/src/modules/electoral-roll/**`
- Inspect/Modify only if required: `ui/src/features/votes/model/electoral-roll.types.ts`
- Inspect/Modify only if required: `ui/src/features/votes/api/electoral-roll-api.ts`
- Inspect/Modify only if required: `ui/src/features/votes/api/vote-operations-api.ts`
- Inspect/Modify only if required: `ui/src/features/votes/lib/electoral-roll-member-validation.ts`
- Test: `ui/test/features/votes/**`

**Interfaces:** Verify PUT/PATCH identity fields, GET masked member fields, validation invariants, and identity-required roll attachment 400 handling.

- [x] Read actual server request DTOs, controller mappings, response DTO/view fields, domain validation, masking, and vote attachment validation.
- [x] Compare exact optionality, formatting, response property names, and error behavior against UI types and requests.
- [x] Add focused regression coverage before any necessary minimal contract adjustment.
- [x] Keep unchanged masked values out of PATCH requests and never log raw identity values.

### Task 3: Perform non-disruptive live checks

**Files:** None unless a confirmed UI integration defect requires a minimal UI-only fix.

**Interfaces:** Consume already-running UI/server/Auth endpoints and public/local test credentials only when already configured; produce status-only evidence without secrets or identity values.

- [x] Inspect listening processes and health endpoints without stopping or restarting anything.
- [x] Determine whether an authenticated session or safe existing test path is available without printing credentials or tokens.
- [x] Exercise create/update/detail masking and identity-required attachment failure only when reversible test records and valid authorization are safely available.
- [x] If blocked, identify the exact failing boundary and configuration/process condition without changing process state.

### Task 4: Verify and report

**Files:** UI source and tests changed by Tasks 1-2.

**Interfaces:** Produce fresh test, lint, build/typecheck, Git, conflict, and live-check evidence.

- [x] Run targeted contract tests.
- [x] Run full `pnpm --dir ui test`, `pnpm --dir ui lint`, and `pnpm --dir ui build` after `nvm use`.
- [x] Run `git diff --check`, confirm no unresolved paths, confirm the protected dirty state remains, and report final HEAD.
- [x] Report the merge commit, conflict files, UI adjustments, verification results, and any exact live-test blocker. Do not commit further changes or push.
