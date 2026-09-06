# UI Attachment Management Implementation Plan

> **For agentic workers:** Execute this plan in the existing UI worktree. Do not commit, push, create a PR, restart processes, or modify server files.

**Goal:** Replace temporary client-only attachment lists with server-projected attachments and support secure download and deletion for vote, sub-vote, and candidate targets.

**Architecture:** Normalize attachment metadata into vote UI domain models, keep the upload API's three-step flow, and add target-specific download/delete methods. Containers own React Query invalidation while the feature UI receives attachment arrays and action callbacks through props.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack React Query, Vitest, Testing Library.

**Spec:** Server contract merged at local master `5fc7c3b98546537b50fc25e79a4e95137a470dab`.

## Global Constraints

- Preserve all existing UI changes and safety stashes.
- Do not stop or restart UI, Vote API, worker, or Auth processes.
- Do not modify server files.
- Do not expose `storageKey`, checksum, tokens, secrets, or database credentials.
- Do not commit, push, create a PR, or merge after implementation.

---

### Task 1: Normalize attachment projections

**Files:**
- Modify: `ui/src/features/votes/model/vote-attachment.types.ts`
- Modify: `ui/src/features/votes/model/vote.types.ts`
- Modify: `ui/src/features/votes/model/vote-operations.types.ts`
- Modify: `ui/src/features/votes/api/votes-api.ts`
- Modify: `ui/src/features/votes/api/vote-operations-api.ts`
- Modify: `ui/src/features/votes/api/votes-fixtures.ts`
- Modify: `ui/src/features/votes/api/vote-operations-fixtures.ts`
- Test: `ui/test/features/votes/api/votes-api.test.ts`
- Test: `ui/test/features/votes/api/vote-operations-api.test.ts`

**Produces:** `AttachmentRecord<TType>` arrays on parent votes, sub-votes, and candidates, normalized to empty arrays when absent.

- [ ] Add exact projection fields: `id`, `fileId`, `type`, `originalName`, `mimeType`, `sizeBytes`, `sortOrder`, `createdAt`.
- [ ] Map nested server attachment arrays without accepting `storageKey` or checksum.
- [ ] Update mock fixtures and verify parent/nested mappings with unit tests.

### Task 2: Add target-specific download and deletion APIs

**Files:**
- Modify: `ui/src/features/votes/api/vote-attachment-api.ts`
- Test: `ui/test/features/votes/api/vote-attachment-api.test.ts`

**Produces:** Download URL and 204 deletion methods for `VoteAttachmentTarget`, `VoteDetailAttachmentTarget`, and `CandidateAttachmentTarget`.

- [ ] Add GET download URL helpers for all three server paths.
- [ ] Add DELETE helpers that accept HTTP 204 without parsing JSON.
- [ ] Preserve POST upload URL/confirm request bodies and external binary PUT behavior.
- [ ] Map 403, 404, 409, and 503 responses to actionable Korean messages.
- [ ] Model mock projection changes so query invalidation, not component-local lists, refreshes mock screens.

### Task 3: Render server attachments and actions

**Files:**
- Modify: `ui/src/features/votes/ui/attachment-upload-section.tsx`
- Modify: `ui/src/features/votes/container/vote-detail-container.tsx`
- Modify: `ui/src/features/votes/container/vote-edit-container.tsx`
- Modify: `ui/src/features/votes/container/vote-setup-container.tsx`
- Modify: `ui/src/features/votes/container/sub-vote-operations-container.tsx`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Consumes:** Server-projected attachment arrays and target-specific API methods.

**Produces:** Persistent lists with download and confirmed deletion; upload/confirm/delete invalidates only related vote and sub-vote queries.

- [ ] Remove the component-local confirmed attachment array.
- [ ] Render sorted projection metadata, empty state, file size, download, and two-step deletion controls.
- [ ] Invalidate vote detail/list and sub-vote operations after confirm or delete.
- [ ] Feed refreshed parent and candidate projections into detail, edit, creation wizard, and candidate operations screens.
- [ ] Verify locked votes allow viewing/downloading while blocking upload and deletion.

### Task 4: Regression verification

**Files:**
- Test: `ui/test/features/votes/api/vote-attachment-api.test.ts`
- Test: `ui/test/features/votes/api/votes-api.test.ts`
- Test: `ui/test/features/votes/api/vote-operations-api.test.ts`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

- [ ] Run focused API and container tests.
- [ ] Run the complete UI test suite.
- [ ] Run ESLint, `tsc --noEmit`, production build, and `git diff --check` under Node 24 from `.nvmrc`.
- [ ] Confirm only UI and this plan changed after the master fast-forward.
