# Vote Admin Operations Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five authenticated administrator workflows backed by explicit live and mock API clients.

**Architecture:** Extend the existing vote feature with operation-specific model, fixture, API, query, container, and hookless UI files. Route files keep authentication and account composition thin. React Query owns reads and command mutations; local React state owns temporary form and wizard state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, TanStack React Query, Tailwind CSS 4, shadcn-style local primitives, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-vote-admin-operations-screens-design.md`

## Global Constraints

- Use Node 24 selected by `.nvmrc`.
- Keep reusable components independent from feature models and API modules.
- Put feature-aware hooks in `features/votes/container` and hookless composition in `features/votes/ui`.
- Mock mode must not call vote or OIDC servers.
- Do not add ballot casting or participation evidence to administrator routes.
- Do not expose raw identity provider transactions in the UI.

---

### Task 1: Operation contracts and API client

**Files:**
- Create: `ui/src/features/votes/model/vote-operations.types.ts`
- Create: `ui/src/features/votes/api/vote-operations-fixtures.ts`
- Create: `ui/src/features/votes/api/vote-operations-api.ts`
- Create: `ui/src/features/votes/api/vote-operations-query-options.ts`
- Modify: `ui/src/features/votes/model/vote.types.ts`
- Modify: `ui/src/features/votes/api/votes-api.ts`
- Test: `ui/test/features/votes/api/vote-operations-api.test.ts`

**Interfaces:**
- Produces `SubVoteOperations`, `ElectorRecord`, `CommissionRecord`, `FieldSessionRecord`, `VoteSetupDraft`, and `createVoteOperationsApiClient()`.
- Produces query options keyed by API mode and resource identifiers.

- [ ] Add child-vote hierarchy to the existing vote detail model and mapper.
- [ ] Define live DTO mapping and in-memory mock fixtures for all five workflows.
- [ ] Implement GET queries and POST/PUT commands with JSON envelopes.
- [ ] Represent unavailable live commission and field-session reads with `readAvailable: false`.
- [ ] Test mock no-fetch behavior and representative live request contracts.

### Task 2: Shared operations navigation and form primitives

**Files:**
- Create: `ui/src/components/ui/input.tsx`
- Create: `ui/src/components/ui/textarea.tsx`
- Create: `ui/src/components/ui/select.tsx`
- Modify: `ui/src/features/votes/ui/vote-navigation.tsx`
- Modify: `ui/src/features/votes/container/vote-detail-container.tsx`
- Create: `ui/src/features/votes/ui/vote-sub-vote-section.tsx`

**Interfaces:**
- Navigation accepts `dashboard | votes | field-sessions | commissions`.
- Vote detail exposes child-vote links and an elector-management action.

- [ ] Add labeled, accessible input primitives using existing focus tokens.
- [ ] Add compact desktop navigation with responsive overflow behavior.
- [ ] Preserve child-vote grouping and add links from vote detail.

### Task 3: Child vote operations screen

**Files:**
- Create: `ui/src/app/votes/[voteId]/sub-votes/[voteDetailId]/page.tsx`
- Create: `ui/src/features/votes/container/sub-vote-operations-container.tsx`
- Create: `ui/src/features/votes/ui/sub-vote-operations-view.tsx`
- Test: `ui/test/features/votes/container/admin-operations-pages.test.tsx`

**Interfaces:**
- Consumes `subVoteOperationsQueryOptions(voteId, voteDetailId)`.
- Renders policy, candidates, turnout, channel metrics, and result availability.

- [ ] Add authenticated route and account controls.
- [ ] Add loading, error, not-found, live-turnout, and closed-result states.
- [ ] Test mock result and unavailable-result rendering.

### Task 4: Elector management screen

**Files:**
- Create: `ui/src/app/votes/[voteId]/electors/page.tsx`
- Create: `ui/src/features/votes/container/elector-management-container.tsx`
- Create: `ui/src/features/votes/ui/elector-management-view.tsx`

**Interfaces:**
- Consumes elector list query and `createElector()` mutation.
- Form fields are name, identifier, optional phone, birth date, group key, and vote weight.

- [ ] Add paged roster with identity, eligibility, group, and weight columns.
- [ ] Add individual registration form with inline status feedback.
- [ ] Invalidate elector and vote detail queries after successful creation.

### Task 5: Vote setup wizard

**Files:**
- Create: `ui/src/app/votes/new/page.tsx`
- Create: `ui/src/features/votes/container/vote-setup-container.tsx`
- Create: `ui/src/features/votes/ui/vote-setup-wizard.tsx`

**Interfaces:**
- Calls `createVote`, then accepts child-vote, candidate, and elector commands using returned identifiers.
- Wizard state is `basics | ballot | electors | review`.

- [ ] Add policy and channel form for parent creation.
- [ ] Add child-vote and candidate forms after parent creation.
- [ ] Add elector registration step and review links.
- [ ] Keep successful identifiers visible and recoverable within the session.

### Task 6: Field session operations screen

**Files:**
- Create: `ui/src/app/field-sessions/page.tsx`
- Create: `ui/src/features/votes/container/field-session-container.tsx`
- Create: `ui/src/features/votes/ui/field-session-management.tsx`

**Interfaces:**
- Consumes field-session collection result and create/open/close/cancel mutations.

- [ ] Add session creation form for onsite and visit channels.
- [ ] Render status-appropriate command buttons.
- [ ] Show a live-mode read-API limitation notice without inventing persisted data.

### Task 7: Commission management screen

**Files:**
- Create: `ui/src/app/commissions/page.tsx`
- Create: `ui/src/features/votes/container/commission-management-container.tsx`
- Create: `ui/src/features/votes/ui/commission-management.tsx`

**Interfaces:**
- Consumes commission collection result and create/register-member mutations.

- [ ] Add commission creation and member registration forms.
- [ ] Render member roles and status in mock/current-session records.
- [ ] Show a live-mode read-API limitation notice.

### Task 8: Verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `ui/test/features/votes/container/admin-operations-pages.test.tsx`

**Interfaces:**
- Produces documented routes and verified live/mock builds.

- [ ] Test the five route-level containers in mock mode.
- [ ] Run `pnpm --filter @vote/ui test`.
- [ ] Run `pnpm --filter @vote/ui lint`.
- [ ] Build with `NEXT_PUBLIC_VOTE_API_MODE=live` and `mock`.
- [ ] Audit visible copy, mobile fallbacks, loading, empty, and error states.
