# Vote UI Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build authenticated read-focused vote dashboard, vote list, and vote detail screens.

**Architecture:** Next App Router route files stay thin and only perform session gating plus component composition. React Query owns mock asynchronous vote data, Zustand owns only local filters, and React components are declared only under `ui/src/components/votes`.

**Tech Stack:** Next.js 16 App Router, React 19, Auth.js/NextAuth v5 beta, TanStack React Query, Zustand, Vitest, Tailwind, shadcn-style local primitives, lucide-react.

## Global Constraints

- Use routes `/`, `/votes`, and `/votes/[voteId]`.
- Keep all React component declarations under `ui/src/components`.
- Do not add `.tsx` files under `ui/src/features`.
- Do not import `@/components` from `ui/src/features`.
- Use React Query for dashboard/list/detail data.
- Use Zustand only for local UI filters.
- Do not duplicate React Query response data into Zustand.
- Use mock fetch functions until backend API contracts are available.
- Keep route files thin: call `auth()`, render `SignInPage` when unauthenticated, render composed components when authenticated.
- Use Node 24 for commands.

---

## File Structure

Create feature logic:

- `ui/src/features/votes/model/vote.types.ts`: feature-owned vote data types.
- `ui/src/features/votes/model/vote-selectors.ts`: pure participation, filtering, lookup, and dashboard summary helpers.
- `ui/src/features/votes/model/vote-selectors.test.ts`: Vitest tests for pure feature behavior.
- `ui/src/features/votes/api/votes-query-options.ts`: mock data and React Query option factories.
- `ui/src/features/votes/store/votes-ui.store.ts`: Zustand filters for list and detail roster.
- `ui/src/features/votes/store/votes-ui.store.test.ts`: Vitest tests for store actions.

Create components:

- `ui/src/components/votes/page-shell.tsx`: shared authenticated page frame and header actions.
- `ui/src/components/votes/vote-dashboard-page.tsx`: dashboard container using React Query.
- `ui/src/components/votes/vote-list-page.tsx`: list container using React Query and Zustand filters.
- `ui/src/components/votes/vote-detail-page.tsx`: detail container using React Query and Zustand roster filter.
- `ui/src/components/votes/vote-summary-card.tsx`: metric card.
- `ui/src/components/votes/vote-status-badge.tsx`: status badge.
- `ui/src/components/votes/vote-period.tsx`: formatted date range.
- `ui/src/components/votes/vote-participation-bar.tsx`: participation progress display.
- `ui/src/components/votes/candidate-list.tsx`: candidate section.
- `ui/src/components/votes/elector-roster.tsx`: elector section.

Modify routes:

- `ui/src/app/page.tsx`: render `VoteDashboardPage` instead of the starter dashboard.
- `ui/src/app/votes/page.tsx`: authenticated vote list route.
- `ui/src/app/votes/[voteId]/page.tsx`: authenticated vote detail route.

Optional cleanup:

- Leave existing `dashboard` component/feature files in place unless unused lint rules require changes. Removing old files is safe only if nothing imports them.

---

### Task 1: Vote Feature Model, Selectors, Query Options

**Files:**
- Create: `ui/src/features/votes/model/vote.types.ts`
- Create: `ui/src/features/votes/model/vote-selectors.ts`
- Create: `ui/src/features/votes/model/vote-selectors.test.ts`
- Create: `ui/src/features/votes/api/votes-query-options.ts`

**Interfaces:**
- Produces:
  - `type VoteStatus = "draft" | "scheduled" | "active" | "completed" | "canceled"`
  - `interface VoteSummary`
  - `interface VoteDetail`
  - `interface VoteCandidate`
  - `interface VoteElector`
  - `interface VoteDashboard`
  - `type VoteStatusFilter = "all" | "draft" | "scheduled" | "active" | "completed" | "canceled"`
  - `type ElectorParticipationFilter = "all" | "participated" | "not-participated"`
  - `formatParticipationRate(participatedCount: number, electorCount: number): string`
  - `getParticipationPercent(participatedCount: number, electorCount: number): number`
  - `filterVotes(votes: VoteSummary[], input: { statusFilter: VoteStatusFilter; searchText: string }): VoteSummary[]`
  - `filterElectors(electors: VoteElector[], filter: ElectorParticipationFilter): VoteElector[]`
  - `findVoteDetail(votes: VoteDetail[], voteId: string): VoteDetail | null`
  - `buildVoteDashboard(votes: VoteDetail[]): VoteDashboard`
  - `voteDashboardQueryOptions()`
  - `voteListQueryOptions()`
  - `voteDetailQueryOptions(voteId: string)`

- [ ] **Step 1: Write failing selector tests**

Create `ui/src/features/votes/model/vote-selectors.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  buildVoteDashboard,
  filterElectors,
  filterVotes,
  findVoteDetail,
  formatParticipationRate,
  getParticipationPercent,
} from "./vote-selectors";
import type { VoteDetail, VoteSummary } from "./vote.types";

const summaries: VoteSummary[] = [
  {
    id: "active-general",
    title: "2026 상반기 대표 선출",
    status: "active",
    startsAt: "2026-08-10T09:00:00.000Z",
    endsAt: "2026-08-20T09:00:00.000Z",
    electorCount: 100,
    participatedCount: 72,
  },
  {
    id: "scheduled-budget",
    title: "예산 승인 투표",
    status: "scheduled",
    startsAt: "2026-09-01T09:00:00.000Z",
    endsAt: "2026-09-05T09:00:00.000Z",
    electorCount: 50,
    participatedCount: 0,
  },
];

const details: VoteDetail[] = [
  {
    ...summaries[0],
    description: "대표 후보를 선출합니다.",
    candidates: [
      { id: "candidate-1", name: "김대표", description: "운영 개선", order: 1 },
    ],
    electors: [
      {
        id: "elector-1",
        name: "이선거",
        label: "운영팀",
        participated: true,
        participatedAt: "2026-08-11T02:00:00.000Z",
      },
      {
        id: "elector-2",
        name: "박미참",
        label: "재무팀",
        participated: false,
        participatedAt: null,
      },
    ],
  },
  {
    ...summaries[1],
    description: "예산안을 승인합니다.",
    candidates: [],
    electors: [],
  },
];

describe("vote selectors", () => {
  it("formats participation from counts and handles an empty electorate", () => {
    expect(getParticipationPercent(72, 100)).toBe(72);
    expect(formatParticipationRate(72, 100)).toBe("72%");
    expect(getParticipationPercent(0, 0)).toBe(0);
    expect(formatParticipationRate(0, 0)).toBe("0%");
  });

  it("filters votes by status and search text", () => {
    expect(filterVotes(summaries, { statusFilter: "active", searchText: "" })).toEqual([
      summaries[0],
    ]);
    expect(filterVotes(summaries, { statusFilter: "all", searchText: "예산" })).toEqual([
      summaries[1],
    ]);
    expect(filterVotes(summaries, { statusFilter: "completed", searchText: "" })).toEqual([]);
  });

  it("filters electors by participation state", () => {
    expect(filterElectors(details[0].electors, "participated")).toEqual([
      details[0].electors[0],
    ]);
    expect(filterElectors(details[0].electors, "not-participated")).toEqual([
      details[0].electors[1],
    ]);
    expect(filterElectors(details[0].electors, "all")).toEqual(details[0].electors);
  });

  it("returns null for an unknown vote detail id", () => {
    expect(findVoteDetail(details, "missing")).toBeNull();
  });

  it("builds dashboard sections from vote details", () => {
    expect(buildVoteDashboard(details)).toMatchObject({
      metrics: {
        activeVotes: 1,
        scheduledVotes: 1,
        completedVotes: 0,
        averageParticipationRate: "36%",
      },
      activeVotes: [details[0]],
      upcomingVotes: [details[1]],
      attentionVotes: [],
    });
  });
});
```

- [ ] **Step 2: Run selector tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui test -- vote-selectors.test.ts
```

Expected: FAIL because `./vote-selectors` and `./vote.types` do not exist.

- [ ] **Step 3: Implement vote types and pure selectors**

Create `vote.types.ts` with the interfaces listed in this task.

Create `vote-selectors.ts` with pure implementations:

```ts
export function getParticipationPercent(participatedCount: number, electorCount: number) {
  if (electorCount <= 0) return 0;
  return Math.round((participatedCount / electorCount) * 100);
}
```

Implement the rest with case-insensitive `title` search and exact status filtering.

- [ ] **Step 4: Implement mock query options**

Create `votes-query-options.ts` with a small in-memory `mockVoteDetails` array containing at least:

- one active vote
- one scheduled vote
- one completed vote
- candidate data
- elector roster data with both participated and not participated electors

Each query function should delay briefly and return derived data:

- `voteDashboardQueryOptions()` returns `buildVoteDashboard(mockVoteDetails)`
- `voteListQueryOptions()` returns `mockVoteDetails` summarized as `VoteSummary[]`
- `voteDetailQueryOptions(voteId)` returns `findVoteDetail(mockVoteDetails, voteId)`

- [ ] **Step 5: Run selector tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui test -- vote-selectors.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit task 1**

```bash
git add ui/src/features/votes
git commit -m "feat(ui): add vote feature model"
```

---

### Task 2: Vote UI Zustand Store

**Files:**
- Create: `ui/src/features/votes/store/votes-ui.store.ts`
- Create: `ui/src/features/votes/store/votes-ui.store.test.ts`

**Interfaces:**
- Consumes:
  - `VoteStatusFilter`
  - `ElectorParticipationFilter`
- Produces:
  - `useVotesUiStore`
  - store state fields `statusFilter`, `searchText`, `electorParticipationFilter`
  - actions `setStatusFilter`, `setSearchText`, `setElectorParticipationFilter`, `resetVotesUi`

- [ ] **Step 1: Write failing store tests**

Create `votes-ui.store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";

import { useVotesUiStore } from "./votes-ui.store";

describe("useVotesUiStore", () => {
  beforeEach(() => {
    useVotesUiStore.getState().resetVotesUi();
  });

  it("stores vote list filters", () => {
    useVotesUiStore.getState().setStatusFilter("active");
    useVotesUiStore.getState().setSearchText("대표");

    expect(useVotesUiStore.getState().statusFilter).toBe("active");
    expect(useVotesUiStore.getState().searchText).toBe("대표");
  });

  it("stores elector roster participation filter", () => {
    useVotesUiStore.getState().setElectorParticipationFilter("not-participated");

    expect(useVotesUiStore.getState().electorParticipationFilter).toBe(
      "not-participated",
    );
  });

  it("resets filters to default values", () => {
    useVotesUiStore.getState().setStatusFilter("completed");
    useVotesUiStore.getState().setSearchText("예산");
    useVotesUiStore.getState().setElectorParticipationFilter("participated");

    useVotesUiStore.getState().resetVotesUi();

    expect(useVotesUiStore.getState()).toMatchObject({
      statusFilter: "all",
      searchText: "",
      electorParticipationFilter: "all",
    });
  });
});
```

- [ ] **Step 2: Run store tests to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui test -- votes-ui.store.test.ts
```

Expected: FAIL because `votes-ui.store.ts` does not exist.

- [ ] **Step 3: Implement the Zustand store**

Create `votes-ui.store.ts` with:

```ts
import { create } from "zustand";

import type {
  ElectorParticipationFilter,
  VoteStatusFilter,
} from "@/features/votes/model/vote.types";
```

Default values:

- `statusFilter: "all"`
- `searchText: ""`
- `electorParticipationFilter: "all"`

- [ ] **Step 4: Run store tests to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui test -- votes-ui.store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit task 2**

```bash
git add ui/src/features/votes/store
git commit -m "feat(ui): add vote ui filter store"
```

---

### Task 3: Shared Vote Components

**Files:**
- Create: `ui/src/components/votes/vote-status-badge.tsx`
- Create: `ui/src/components/votes/vote-period.tsx`
- Create: `ui/src/components/votes/vote-participation-bar.tsx`
- Create: `ui/src/components/votes/vote-summary-card.tsx`
- Create: `ui/src/components/votes/candidate-list.tsx`
- Create: `ui/src/components/votes/elector-roster.tsx`
- Create: `ui/src/components/votes/page-shell.tsx`

**Interfaces:**
- Consumes vote model types and selector helpers.
- Produces presentational components for dashboard, list, and detail pages.

- [ ] **Step 1: Write a component smoke test**

Create `ui/src/components/votes/vote-components.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CandidateList } from "./candidate-list";
import { VoteParticipationBar } from "./vote-participation-bar";
import { VoteStatusBadge } from "./vote-status-badge";

describe("vote shared components", () => {
  it("renders status, participation, and candidate labels", () => {
    const markup = renderToStaticMarkup(
      <>
        <VoteStatusBadge status="active" />
        <VoteParticipationBar participatedCount={7} electorCount={10} />
        <CandidateList
          candidates={[
            {
              id: "candidate-1",
              name: "김대표",
              description: "운영 개선",
              order: 1,
            },
          ]}
        />
      </>,
    );

    expect(markup).toContain("진행 중");
    expect(markup).toContain("70%");
    expect(markup).toContain("김대표");
  });
});
```

- [ ] **Step 2: Run component smoke test to verify RED**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui test -- vote-components.test.tsx
```

Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement shared components**

Use `Card`, `Badge`, `Button`, `Separator`, and lucide icons where useful. Keep components generic to vote display and do not put feature-specific state inside the shared display components.

Status labels:

- `draft`: `초안`
- `scheduled`: `예정`
- `active`: `진행 중`
- `completed`: `종료`
- `canceled`: `취소`

`VoteParticipationBar` should render a stable progress track using CSS width style from `getParticipationPercent`.

- [ ] **Step 4: Run component smoke test to verify GREEN**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui test -- vote-components.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit task 3**

```bash
git add ui/src/components/votes
git commit -m "feat(ui): add vote display components"
```

---

### Task 4: Vote Dashboard Route And Page

**Files:**
- Create: `ui/src/components/votes/vote-dashboard-page.tsx`
- Modify: `ui/src/app/page.tsx`

**Interfaces:**
- Consumes:
  - `voteDashboardQueryOptions()`
  - `VoteSummaryCard`
  - `VoteStatusBadge`
  - `VoteParticipationBar`
  - `PageShell`
- Produces dashboard landing page for authenticated users.

- [ ] **Step 1: Run existing tests as a baseline**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui test
```

Expected: PASS before route changes.

- [ ] **Step 2: Implement `VoteDashboardPage`**

Create a client component that:

- calls `useQuery(voteDashboardQueryOptions())`
- shows loading cards while loading
- shows a retryable error state if query fails
- shows summary cards for active, scheduled, completed, average participation
- shows active votes, upcoming votes, attention votes, and recent activity
- links to `/votes` and `/votes/[voteId]`

- [ ] **Step 3: Replace root dashboard composition**

Modify `ui/src/app/page.tsx` to import and render `VoteDashboardPage` for authenticated sessions. Keep `dynamic = "force-dynamic"` and `SignInPage` behavior.

- [ ] **Step 4: Verify dashboard build**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui lint
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui build
```

Expected: both commands PASS.

- [ ] **Step 5: Commit task 4**

```bash
git add ui/src/components/votes/vote-dashboard-page.tsx ui/src/app/page.tsx
git commit -m "feat(ui): add vote dashboard screen"
```

---

### Task 5: Vote List Route And Page

**Files:**
- Create: `ui/src/components/votes/vote-list-page.tsx`
- Create: `ui/src/app/votes/page.tsx`

**Interfaces:**
- Consumes:
  - `voteListQueryOptions()`
  - `filterVotes`
  - `useVotesUiStore`
  - shared vote display components
- Produces authenticated `/votes` route.

- [ ] **Step 1: Run selector and store tests as a baseline**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui test -- vote-selectors.test.ts votes-ui.store.test.ts
```

Expected: PASS.

- [ ] **Step 2: Implement `VoteListPage`**

Create a client component that:

- calls `useQuery(voteListQueryOptions())`
- reads `statusFilter` and `searchText` from `useVotesUiStore`
- filters rows with `filterVotes`
- renders status filter buttons
- renders a search input
- renders table-like rows with title, period, status, participation, elector counts, and detail link
- renders empty state for no votes or no matches

- [ ] **Step 3: Implement `/votes` route**

Create `ui/src/app/votes/page.tsx`:

```tsx
import { SignInPage } from "@/components/auth/sign-in-page";
import { VoteListPage } from "@/components/votes/vote-list-page";
import { auth } from "@/shared/auth/auth";

export const dynamic = "force-dynamic";

export default async function VotesPage() {
  const session = await auth();

  if (!session?.user) {
    return <SignInPage />;
  }

  return <VoteListPage />;
}
```

- [ ] **Step 4: Verify list route**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui lint
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui build
```

Expected: both commands PASS and build output includes `/votes`.

- [ ] **Step 5: Commit task 5**

```bash
git add ui/src/components/votes/vote-list-page.tsx ui/src/app/votes/page.tsx
git commit -m "feat(ui): add vote list screen"
```

---

### Task 6: Vote Detail Route And Page

**Files:**
- Create: `ui/src/components/votes/vote-detail-page.tsx`
- Create: `ui/src/app/votes/[voteId]/page.tsx`

**Interfaces:**
- Consumes:
  - `voteDetailQueryOptions(voteId)`
  - `filterElectors`
  - `useVotesUiStore`
  - shared vote display components
- Produces authenticated `/votes/[voteId]` route.

- [ ] **Step 1: Run selector and store tests as a baseline**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui test -- vote-selectors.test.ts votes-ui.store.test.ts
```

Expected: PASS.

- [ ] **Step 2: Implement `VoteDetailPage`**

Create a client component with props:

```ts
interface VoteDetailPageProps {
  voteId: string;
}
```

The component should:

- call `useQuery(voteDetailQueryOptions(voteId))`
- render loading state
- render retryable error state
- render not-found state when data is `null`
- render title, description, period, status, participation summary
- render candidates through `CandidateList`
- render electors through `ElectorRoster`
- read and update `electorParticipationFilter` from `useVotesUiStore`
- provide a link back to `/votes`

- [ ] **Step 3: Implement `/votes/[voteId]` route**

Create `ui/src/app/votes/[voteId]/page.tsx`:

```tsx
import { SignInPage } from "@/components/auth/sign-in-page";
import { VoteDetailPage } from "@/components/votes/vote-detail-page";
import { auth } from "@/shared/auth/auth";

export const dynamic = "force-dynamic";

interface VoteDetailRouteProps {
  params: Promise<{
    voteId: string;
  }>;
}

export default async function VoteDetailRoute({ params }: VoteDetailRouteProps) {
  const session = await auth();

  if (!session?.user) {
    return <SignInPage />;
  }

  const { voteId } = await params;

  return <VoteDetailPage voteId={voteId} />;
}
```

- [ ] **Step 4: Verify detail route**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui lint
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui build
```

Expected: both commands PASS and build output includes `/votes/[voteId]`.

- [ ] **Step 5: Commit task 6**

```bash
git add ui/src/components/votes/vote-detail-page.tsx 'ui/src/app/votes/[voteId]/page.tsx'
git commit -m "feat(ui): add vote detail screen"
```

---

### Task 7: Final Verification And Cleanup

**Files:**
- Modify only if required by verification.

**Interfaces:**
- Consumes all previous tasks.
- Produces a verified branch with read-focused vote screens.

- [ ] **Step 1: Run full UI tests**

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui test
```

Expected: all UI tests PASS.

- [ ] **Step 2: Run lint and production build**

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui lint
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm --filter @vote/ui build
```

Expected: both commands PASS.

- [ ] **Step 3: Run all workspace tests**

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm test:all
```

Expected: server and UI tests PASS.

- [ ] **Step 4: Run structure checks**

```bash
find ui/src/features -type f \( -name '*.tsx' -o -name '*.jsx' \) -print
rg -n "@/components" ui/src/features || true
```

Expected: no `.tsx`/`.jsx` files and no `@/components` imports under `ui/src/features`.

- [ ] **Step 5: Start local dev server for smoke check**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && pnpm dev:ui
```

Expected: Next reports `Local: http://localhost:3001`.

If `AUTH_SECRET` is absent, `auth()` may log `MissingSecret` when requesting the page. Use `ui/.env.local` with a local `AUTH_SECRET` for browser verification.

- [ ] **Step 6: Commit verification-only fixes if any**

Only commit if Step 1-5 require code changes.

```bash
git status --short
git add <changed-files>
git commit -m "fix(ui): stabilize vote screens"
```

---

## Self-Review

Spec coverage:

- Dashboard route and content: Task 4.
- Vote list route and filters: Task 5.
- Vote detail route, candidates, and elector roster: Task 6.
- React Query data flow: Task 1 and page tasks.
- Zustand local filters: Task 2, Task 5, Task 6.
- Feature-slice boundaries: Global Constraints and Task 7.
- Loading, error, empty, and not-found states: Task 4, Task 5, Task 6.
- Tests for selectors and store behavior: Task 1 and Task 2.

Marker scan:

- No incomplete-work markers remain.

Type consistency:

- `VoteStatusFilter`, `ElectorParticipationFilter`, `VoteSummary`, `VoteDetail`, and selector names match across tasks.
