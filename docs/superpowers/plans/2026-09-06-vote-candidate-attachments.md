# Vote and Candidate Attachment Upload Implementation Plan

> **For Codex:** Execute this plan in the current UI worktree while preserving all existing changes. Do not commit, push, merge, or modify server files.

**Goal:** Let administrators register parent-vote and candidate attachments through the server's presigned-upload contract.

**Architecture:** Add attachment request/confirm types and a focused API client under the votes feature. A reusable presentation component owns only the selected file and upload-stage UI; page containers bind it to a concrete vote or candidate target. Confirmed files remain session-local because the server has no attachment read API.

**Tech Stack:** Next.js, React, TypeScript, TanStack Query, Vitest, Testing Library.

---

### Task 1: Attachment contract and API client

**Files:**
- Create: `ui/src/features/votes/model/vote-attachment.types.ts`
- Create: `ui/src/features/votes/api/vote-attachment-api.ts`
- Test: `ui/test/features/votes/api/vote-attachment-api.test.ts`

Implement target-specific metadata validation, presigned URL requests, unauthenticated binary PUT, confirmation, and deterministic mock-mode responses. Keep request and confirmation separate so confirmation can be retried with the same storage key.

### Task 2: Reusable upload UI

**Files:**
- Create: `ui/src/features/votes/ui/attachment-upload-section.tsx`
- Test: `ui/test/features/votes/ui/attachment-upload-section.test.tsx`

Implement accessible file/type fields, validation feedback, upload progress stages, confirmation-only retry, URL reissue for failed object uploads, and a session-local confirmed list without download links.

### Task 3: Vote and candidate integration

**Files:**
- Modify: `ui/src/features/votes/container/vote-edit-container.tsx`
- Modify: `ui/src/features/votes/container/sub-vote-operations-container.tsx`
- Modify: `ui/src/features/votes/ui/sub-vote-operations-view.tsx`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

Add parent-vote attachment registration to editable vote settings. Add a candidate attachment section per candidate, enabled only while both parent and child vote settings are editable. Surface server lock/storage errors through the upload section.

### Task 4: Verification

Run focused tests, full UI tests, lint, TypeScript no-emit checking, build, and `git diff --check` after `nvm use`. Do not attempt live attachment listing or download verification because those server APIs do not exist.
