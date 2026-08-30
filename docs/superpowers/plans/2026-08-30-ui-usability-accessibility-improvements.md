# UI Usability and Accessibility Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the vote operations UI easier to navigate, share, scan, and use with keyboards and assistive technology.

**Architecture:** Keep route authentication in App Router pages, server-only sign-out wiring in the auth container, query and URL synchronization in vote containers, and hookless feature composition in vote UI files. Generic layout, form, feedback, and collection components remain feature-independent and receive state through props.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, TanStack React Query, Zustand, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-08-30-ui-usability-accessibility-improvements.md`

## Global Constraints

- Preserve `/`, `/votes`, and `/votes/[voteId]`.
- Preserve backend API contracts and existing user changes outside `ui`.
- Add no runtime dependencies.
- Put UI tests under `ui/test`.
- Run commands after `nvm use` selects Node 24.
- Do not create commits unless the user explicitly asks.

---

### Task 1: Authenticated App Shell

**Files:**
- Modify: `ui/src/components/layout/page-shell.tsx`
- Modify: `ui/src/components/ui/card.tsx`
- Create: `ui/src/features/auth/container/session-controls-container.tsx`
- Create: `ui/src/features/votes/ui/vote-navigation.tsx`
- Modify: `ui/src/features/votes/container/vote-dashboard-container.tsx`
- Modify: `ui/src/features/votes/container/vote-list-container.tsx`
- Modify: `ui/src/features/votes/container/vote-detail-container.tsx`
- Modify: `ui/src/app/page.tsx`
- Modify: `ui/src/app/votes/page.tsx`
- Modify: `ui/src/app/votes/[voteId]/page.tsx`
- Test: `ui/test/components/component-primitives.test.tsx`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**
- `PageShell` consumes optional `account` and `navigation` React nodes.
- `SessionControlsContainer` consumes `userName: string` and submits the existing Auth.js `signOut` server action.
- `VoteNavigation` consumes `current: "dashboard" | "votes"` and renders semantic links.

- [ ] Add a failing render assertion for a skip link, semantic page/card headings, and navigation labels.
- [ ] Extend `PageShell` with a banner, brand block, navigation/account slots, skip link, and `main-content` target.
- [ ] Allow `CardTitle` to render a caller-provided heading through `asChild`.
- [ ] Add hookless vote navigation and the server-only session controls container.
- [ ] Pass session controls from authenticated route files and navigation from vote containers.
- [ ] Run focused component and container tests.

### Task 2: URL-Synchronized Filters and Recoverable Results

**Files:**
- Create: `ui/src/features/votes/lib/vote-search-params.ts`
- Modify: `ui/src/features/votes/store/votes-ui.store.ts`
- Modify: `ui/src/features/votes/container/vote-list-container.tsx`
- Modify: `ui/src/features/votes/container/vote-detail-container.tsx`
- Modify: `ui/src/features/votes/ui/vote-list-results.tsx`
- Test: `ui/test/features/votes/lib/vote-search-params.test.ts`
- Test: `ui/test/features/votes/store/votes-ui.store.test.ts`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**
- `readVoteListSearchParams(params)` returns `{ statusFilter, searchText }` with invalid values normalized to defaults.
- `writeVoteListSearchParams(params, state)` returns a canonical query string with default values removed.
- `readVoteDetailSearchParams(params)` returns `{ electorParticipationFilter, electorPage }`.
- The votes UI store adds `electorPage`, `setElectorPage`, `resetVoteListFilters`, and `resetElectorFilters`.

- [ ] Add failing pure tests for parsing, invalid-value fallback, canonical writing, and roster pages.
- [ ] Implement the pure query-parameter helpers without React imports.
- [ ] Synchronize URL state in vote containers and reset roster page when its filter changes.
- [ ] Add result count announcements and a reset action to filtered empty states.
- [ ] Run helper, store, and container tests.

### Task 3: Large Roster and Responsive Interaction

**Files:**
- Modify: `ui/src/components/collections/participant-roster.tsx`
- Modify: `ui/src/features/votes/ui/vote-detail-roster-section.tsx`
- Test: `ui/test/components/component-primitives.test.tsx`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**
- `ParticipantRoster` consumes controlled `page`, `pageSize`, and `onPageChange` props.
- `VoteDetailRosterSection` forwards feature state without importing stores or navigation hooks.

- [ ] Add failing assertions for a bounded row count, page status, previous/next controls, table caption, and column scopes.
- [ ] Slice roster rows by controlled page and render pagination only when needed.
- [ ] Make the horizontal table region keyboard-focusable and explain horizontal scrolling on narrow screens.
- [ ] Clamp page input after filters reduce the result set.
- [ ] Run roster and detail-container tests.

### Task 4: Feedback, Forms, Motion, and Visual Hierarchy

**Files:**
- Modify: `ui/src/components/ui/button.tsx`
- Modify: `ui/src/components/forms/search-field.tsx`
- Modify: `ui/src/components/feedback/skeleton-card-grid.tsx`
- Modify: `ui/src/components/data/summary-stat-card.tsx`
- Modify: `ui/src/components/data/participation-progress.tsx`
- Modify: `ui/src/features/auth/container/sign-in-container.tsx`
- Modify: `ui/src/features/votes/container/vote-dashboard-container.tsx`
- Modify: `ui/src/features/votes/container/vote-list-container.tsx`
- Modify: `ui/src/features/votes/ui/vote-dashboard-content.tsx`
- Modify: `ui/src/features/votes/ui/vote-dashboard-metrics.tsx`
- Modify: `ui/src/features/votes/ui/vote-summary-link.tsx`
- Modify: `ui/src/app/globals.css`
- Modify: `ui/src/app/layout.tsx`
- Test: `ui/test/components/component-primitives.test.tsx`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**
- `SearchField` emits the same value callback while adding stable form metadata.
- `SkeletonCardGrid` exposes a configurable Korean loading label.
- Dashboard content displays the existing `generatedAt` field using the shared Korean date formatter.

- [ ] Add failing assertions for input metadata, loading status, refresh copy, timestamp, and focus styles.
- [ ] Replace `transition-all`, add touch manipulation, and honor reduced motion.
- [ ] Add input `type`, `name`, autocomplete, spellcheck, and ellipsis placeholder behavior.
- [ ] Add polite loading announcements, tabular numbers, explicit focus rings, and labeled dashboard sections.
- [ ] Improve heading wrapping, theme metadata, system font stack, and dark color scheme behavior.
- [ ] Run focused UI tests.

### Task 5: Verification and Re-audit

**Files:**
- Review: all changed files under `ui/src` and `ui/test`

**Interfaces:**
- No new runtime interfaces.

- [ ] Run `source ~/.nvm/nvm.sh && nvm use && pnpm --filter @vote/ui test` and require all tests to pass.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use && pnpm --filter @vote/ui lint` and require zero lint errors.
- [ ] Run `source ~/.nvm/nvm.sh && nvm use && pnpm --filter @vote/ui build` and require a successful production build.
- [ ] Scan changed UI files for `transition-all`, unlabeled inputs, missing reduced-motion treatment, and feature-boundary violations.
- [ ] Inspect the final diff and confirm unrelated user changes are untouched.
