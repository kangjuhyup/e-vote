# Vote Schedule Contract UI Implementation Plan

> **For agentic workers:** Execute inline in the current UI worktree. Do not dispatch subagents or create commits for this task.

**Goal:** Preserve all existing UI work while synchronizing local master `4cb4d64990f659ec3b4f42f83693d02f336a1fd6` and make vote creation and update always send a valid explicit ISO 8601 schedule.

**Architecture:** Keep server-state and mutation wiring in the existing vote containers, keep the hookless schedule controls in the vote feature UI, and keep wire request names in the vote operations API types. The UI collects `datetime-local` values, validates that the end is later than the start, and converts both values to ISO strings before invoking create or update mutations.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack React Query, Vitest, Testing Library.

**Spec:** User-provided server lifecycle contract for master `4cb4d64990f659ec3b4f42f83693d02f336a1fd6`.

## Global Constraints

- Preserve every tracked/untracked modification and every existing stash.
- Do not reset, restore with checkout, drop stashes, or restart running UI/server/auth processes.
- Keep Vote API and lifecycle worker as separate processes; do not change process scripts in this task.
- Do not modify server source beyond merging the authorized local master commit.
- Do not commit, push, open a PR, or perform another merge without a new user request.

---

### Task 1: Safe master synchronization

**Files:**
- Preserve: all current tracked and untracked files
- Merge: local `master` at `4cb4d64990f659ec3b4f42f83693d02f336a1fd6`

**Interfaces:**
- Consumes: current `UI초기설정` HEAD and worktree status
- Produces: a merge commit containing master while the same local modifications remain present

- [ ] Record HEAD, status, unmerged index entries, stash refs, and overlap with master.
- [ ] Back up the current patch and untracked-file list outside the worktree.
- [ ] Temporarily stash only overlapping `README.md`, leaving source files and running watchers untouched.
- [ ] Merge local master without auto-editing the message and verify no conflicts.
- [ ] Apply the README safety stash without dropping it and verify all prior modifications remain.

### Task 2: Explicit schedule request contract

**Files:**
- Modify: `ui/src/features/votes/model/vote-operations.types.ts`
- Modify: `ui/src/features/votes/api/vote-operations-api.ts`
- Modify: `ui/src/features/votes/container/vote-setup-container.tsx`
- Modify: `ui/src/features/votes/container/vote-edit-container.tsx`
- Modify: `ui/src/features/votes/ui/vote-setup-wizard.tsx`
- Modify: `ui/src/features/votes/ui/vote-settings-form.tsx`

**Interfaces:**
- Consumes: local form values named `startedAt` and `endedAt`
- Produces: `CreateVoteInput` and `UpdateVoteInput` with required ISO-string `startedAt` and `endedAt`

- [ ] Add required start/end fields to both request types.
- [ ] Add accessible `datetime-local` controls to create and edit forms.
- [ ] Convert both local values with `new Date(value).toISOString()` in containers.
- [ ] Reject missing/invalid values and require `endedAt > startedAt` before mutation.
- [ ] Update mock vote state to retain the submitted schedule and live requests to pass both wire fields unchanged.

### Task 3: Contract regression tests

**Files:**
- Modify: `ui/test/features/votes/api/vote-operations-api.test.ts`
- Modify: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**
- Consumes: schedule-enabled create/edit UI and operations API
- Produces: regression coverage for ISO request bodies and accessible range validation

- [ ] Assert live create and update bodies contain both ISO schedule fields.
- [ ] Assert create/edit reject an end time that is not later than the start.
- [ ] Assert a valid create/edit schedule reaches the corresponding mutation flow.

### Task 4: Verification and handoff

**Files:**
- Inspect: repository status, diff, stash list, and current process list

**Interfaces:**
- Consumes: completed UI implementation
- Produces: evidence-backed report without a commit or process restart

- [ ] Run targeted vote tests.
- [ ] Run the full UI test suite, ESLint, `tsc --noEmit`, production build, and `git diff --check` after `nvm use`.
- [ ] Confirm the synchronized HEAD contains master `4cb4d649` and no unmerged index entries exist.
- [ ] Confirm pre-existing stashes and running UI/server/auth processes remain present.
