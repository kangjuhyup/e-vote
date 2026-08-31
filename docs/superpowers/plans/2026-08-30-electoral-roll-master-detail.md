# Electoral Roll Master-Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the electoral-roll list first and open a selected roll's editable member table only after the user chooses a roll.

**Architecture:** Add the existing server page endpoint to the UI API client and React Query layer. Keep list/detail state in the feature container, render a hookless list table or hookless detail view, and preserve the existing member mutations inside the selected detail.

**Tech Stack:** Next.js 16, React 19, TanStack React Query, Tailwind CSS, Vitest, Testing Library

**Spec:** User feedback in the active `/electoral-rolls` task.

## Global Constraints

- Keep React Query and selection state in `ui/src/features/votes/container`.
- Keep feature-specific hookless JSX in `ui/src/features/votes/ui`.
- Reuse the server `GET /electoral-rolls?page=&pageSize=` endpoint without backend changes.
- Keep member add, update, remove, search, and 25-row paging behavior intact.

---

### Task 1: Electoral-roll page API

**Files:**
- Modify: `ui/src/features/votes/model/electoral-roll.types.ts`
- Modify: `ui/src/features/votes/api/electoral-roll-api.ts`
- Modify: `ui/src/features/votes/api/electoral-roll-query-options.ts`
- Test: `ui/test/features/votes/api/electoral-roll-api.test.ts`

**Interfaces:**
- Produces: `fetchElectoralRollPage(input): Promise<ElectoralRollPageRecord>` and `electoralRollPageQueryOptions(input)`.

- [ ] Add page item, page response, and page input types matching the server response.
- [ ] Add live query-string mapping and mock filtering/paging to the API client.
- [ ] Add a stable React Query option keyed by mode and page input.
- [ ] Verify the live route and mock page behavior in the API test.

### Task 2: List-first UI and detail transition

**Files:**
- Create: `ui/src/features/votes/ui/electoral-roll-list.tsx`
- Modify: `ui/src/features/votes/ui/electoral-roll-management.tsx`
- Modify: `ui/src/features/votes/container/electoral-roll-management-container.tsx`

**Interfaces:**
- Consumes: `ElectoralRollPageRecord` and `electoralRollPageQueryOptions` from Task 1.
- Produces: list selection, list pagination, and a back-to-list action around the existing member table.

- [ ] Render roll metadata in a semantic table with an explicit open action.
- [ ] Start with no selected roll, including mock mode.
- [ ] Fetch detail only after selection and provide a back-to-list action.
- [ ] Invalidate list metadata after create and member mutations.

### Task 3: Interaction regression coverage

**Files:**
- Modify: `ui/test/features/votes/container/vote-pages.test.tsx`
- Test: `ui/test/features/votes/ui/electoral-roll-member-section.test.tsx`

**Interfaces:**
- Consumes: the list-first and detail transition behavior from Task 2.

- [ ] Assert the member table is absent on initial render.
- [ ] Select a roll and assert the member table appears.
- [ ] Re-run member add and creation flows through the new navigation.
- [ ] Run focused UI tests, lint, and production build with Node 24.
