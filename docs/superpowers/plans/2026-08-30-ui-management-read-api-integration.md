# UI Management Read API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the UI's temporary unavailable-read behavior with the server's election-commission and field-voting-session query APIs.

**Architecture:** Keep transport and DTO mapping in the vote operations API client, use paged React Query keys in feature containers, and keep the hookless UI responsible only for forms, lists, and pagination controls. Commission page rows are hydrated through the detail endpoint so existing members remain visible; field-session reads are scoped by a selected vote ID because that is the server contract.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack React Query 5, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-08-30-vote-admin-operations-screens-design.md`

## Global Constraints

- Preserve explicit live and mock API modes.
- Do not add ballot casting, participation evidence, or identity-provider transaction controls.
- Keep React Query wiring in `features/votes/container` and hookless composition in `features/votes/ui`.
- Keep all UI tests under `ui/test`.
- Do not add runtime dependencies.
- Do not create a commit unless the user asks.

---

### Task 1: Live management read contracts

**Files:**
- Modify: `ui/src/features/votes/api/vote-operations-api.ts`
- Modify: `ui/src/features/votes/model/vote-operations.types.ts`
- Test: `ui/test/features/votes/api/vote-operations-api.test.ts`

**Interfaces:**
- Produces: `fetchCommissions(page?: number, pageSize?: number): Promise<PageResult<CommissionRecord>>`
- Produces: `fetchFieldSessions(voteId: string, page?: number, pageSize?: number): Promise<PageResult<FieldSessionRecord>>`

- [ ] Replace the unsupported-read test with live response fixtures for `GET /election-commissions`, `GET /election-commissions/:commissionId`, and `GET /votes/:voteId/field-voting-sessions`.
- [ ] Assert encoded paths, `page`/`pageSize` query parameters, response pagination metadata, and commission member mapping.
- [ ] Implement live commission page loading and hydrate each summary with its detail response.
- [ ] Implement vote-scoped live field-session page loading.
- [ ] Preserve mock-mode in-memory filtering and pagination without calling `fetch`.
- [ ] Run `pnpm --filter @vote/ui test -- vote-operations-api.test.ts`.

### Task 2: Paged React Query wiring

**Files:**
- Modify: `ui/src/features/votes/api/vote-operations-query-options.ts`
- Modify: `ui/src/features/votes/container/commission-management-container.tsx`
- Modify: `ui/src/features/votes/container/field-session-container.tsx`

**Interfaces:**
- Produces: `commissionManagementQueryOptions(page: number, pageSize?: number)`.
- Produces: `fieldSessionManagementQueryOptions(voteId: string, page: number, pageSize?: number)`.
- Consumes: paged API client methods from Task 1.

- [ ] Include page, page size, and vote ID where applicable in query keys.
- [ ] Keep the previous page visible while fetching the next page.
- [ ] Remove browser-session fallback collections now that live reads exist.
- [ ] Invalidate the commission prefix after create/member commands and the field-session prefix after create/status commands.
- [ ] Disable field-session reads until a non-empty vote ID is selected.

### Task 3: Management screen controls and copy

**Files:**
- Modify: `ui/src/features/votes/ui/commission-management.tsx`
- Modify: `ui/src/features/votes/ui/field-session-management.tsx`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**
- Commission UI consumes page metadata and `onPageChange(page: number)`.
- Field-session UI consumes selected vote ID, page metadata, `onSelectVote(voteId: string)`, and `onPageChange(page: number)`.

- [ ] Remove the obsolete "server has no read API" notices.
- [ ] Add previous/next pagination with current/total page status to both screens.
- [ ] Add a labeled vote-ID lookup form for the vote-scoped field-session endpoint.
- [ ] Reuse the selected vote ID as the default for new field sessions.
- [ ] Test commission rendering, field-session vote selection, and pagination controls through the containers.

### Task 4: Documentation and verification

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-30-vote-admin-operations-screens-design.md`

**Interfaces:**
- Documents the now-supported commission reads and vote-scoped field-session reads.

- [ ] Remove the obsolete live read limitation from the README and design document.
- [ ] Run the full UI test suite and lint on Node 24.
- [ ] Build the UI once in live mode and once in mock mode.
- [ ] Run the vote UI structure boundary checks and inspect the final diff for unrelated changes.
