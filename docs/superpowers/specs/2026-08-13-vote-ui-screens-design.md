# Vote UI Screens Design

## Goal

Build the initial authenticated vote management screens for the `ui` workspace.

The first slice is a read-focused MVP:

- Vote dashboard
- Vote list
- Vote detail

The implementation should establish page structure, feature-slice boundaries, query models, and UI state patterns without adding vote creation or mutation flows yet.

## Scope

In scope:

- Add routes for dashboard, vote list, and vote detail.
- Use the existing Next.js App Router setup.
- Keep OIDC session gating in route files through `auth()`.
- Use TanStack React Query for vote dashboard/list/detail data.
- Use Zustand only for local UI state such as list filters and detail roster filters.
- Use shadcn-style primitives already present under `ui/src/components/ui`.
- Keep all React component declarations under `ui/src/components`.
- Keep `ui/src/features` free of `.tsx` files and component imports.
- Use mock fetch functions until backend API contracts are available.

Out of scope:

- Vote creation, edit, cancellation, publishing, or deletion flows.
- Candidate management mutations.
- Elector roster upload/import.
- Ballot casting UI for voters.
- Backend endpoint implementation.
- Real API client wiring.
- Role-based authorization rules beyond requiring an authenticated session.

## Navigation

The authenticated UI has three primary routes:

```text
/                 Vote dashboard
/votes            Vote list
/votes/[voteId]   Vote detail
```

The root dashboard is the default authenticated landing page. It links to the vote list and to individual vote details. The vote list links to vote details.

No sidebar is required for this MVP. Use a compact top-level page header pattern with explicit navigation actions where needed.

## Pages

### Vote Dashboard

Route:

```text
ui/src/app/page.tsx
```

Component:

```text
ui/src/components/votes/vote-dashboard-page.tsx
```

Content:

- Summary metrics:
  - active votes
  - scheduled votes
  - completed votes
  - average participation
- Currently active votes section.
- Upcoming votes section.
- Low participation or attention-needed section.
- Recent vote activity section.

Behavior:

- If the user is unauthenticated, render the existing sign-in page.
- If authenticated, render the dashboard.
- Dashboard data is loaded through a React Query query option under `features/votes/api`.
- Refresh action refetches dashboard data.
- Links use Next navigation to `/votes` and `/votes/[voteId]`.

### Vote List

Route:

```text
ui/src/app/votes/page.tsx
```

Component:

```text
ui/src/components/votes/vote-list-page.tsx
```

Content:

- Vote title.
- Vote period.
- Vote status.
- Participation rate.
- Total elector count.
- Participated elector count.
- Detail navigation.

Behavior:

- Route requires an authenticated session.
- List data is loaded through React Query.
- UI filters are stored in Zustand:
  - status filter: all, active, scheduled, completed, draft
  - search text
- Filtering is client-side for the MVP because data is mock/local.
- Empty state appears when filters return no votes.

### Vote Detail

Route:

```text
ui/src/app/votes/[voteId]/page.tsx
```

Component:

```text
ui/src/components/votes/vote-detail-page.tsx
```

Content:

- Vote title.
- Vote content/description.
- Vote period.
- Vote status.
- Participation summary.
- Candidate list:
  - candidate name
  - affiliation or description
  - display order
- Elector roster:
  - elector name
  - identifier or department label
  - participation status: participated or not participated
  - participation timestamp when available

Behavior:

- Route requires an authenticated session.
- Detail data is loaded through React Query by `voteId`.
- Unknown `voteId` renders a not-found style state inside the page component.
- Elector roster filter is stored in Zustand:
  - all
  - participated
  - not participated
- Candidate and elector data are display-only in this MVP.

## Frontend Structure

React components:

```text
ui/src/components/votes/
  vote-dashboard-page.tsx
  vote-list-page.tsx
  vote-detail-page.tsx
  vote-summary-card.tsx
  vote-status-badge.tsx
  vote-period.tsx
  vote-participation-bar.tsx
  candidate-list.tsx
  elector-roster.tsx
```

Feature logic:

```text
ui/src/features/votes/
  api/votes-query-options.ts
  model/vote.types.ts
  store/votes-ui.store.ts
```

Route files stay thin:

- Call `auth()`.
- Render `SignInPage` when unauthenticated.
- Pass route params and session user summary into composed components.

## Data Model

Use feature-owned model types:

```text
VoteStatus = "draft" | "scheduled" | "active" | "completed" | "canceled"

VoteSummary:
  id
  title
  status
  startsAt
  endsAt
  electorCount
  participatedCount

VoteDetail:
  id
  title
  description
  status
  startsAt
  endsAt
  candidates
  electors

VoteCandidate:
  id
  name
  description
  order

VoteElector:
  id
  name
  label
  participated
  participatedAt
```

Participation rate is derived from `participatedCount / electorCount`, not stored separately in Zustand.

## State And Data Flow

React Query:

- `voteDashboardQueryOptions()`
- `voteListQueryOptions()`
- `voteDetailQueryOptions(voteId)`

Zustand:

- vote list search text
- vote list status filter
- vote detail elector participation filter

Do not duplicate React Query response data into Zustand.

## UI Design

Use a work-focused operational layout:

- Dense but readable dashboard cards.
- Table-like list rows for comparison.
- Detail page with clearly separated sections for overview, candidates, and electors.
- Badges for status.
- Progress bar for participation.
- Buttons with lucide icons for navigation and refresh actions.

Avoid marketing-style hero sections, oversized decoration, nested cards, and decorative gradients. The UI should feel like an operations console.

## Loading, Empty, And Error States

Each page handles:

- Loading skeletons.
- Query error state with retry action.
- Empty state for no data.
- Filtered empty state for no matching votes/electors.

The detail page also handles unknown vote ids with an inline not-found state and a link back to the vote list.

## Testing And Verification

Add focused unit tests for feature logic:

```text
ui/src/features/votes/model/vote-selectors.test.ts
```

The tests should cover:

- participation rate formatting
- vote list status/search filtering
- elector roster participation filtering
- unknown vote detail lookup

Verification commands:

```bash
pnpm --filter @vote/ui test
pnpm --filter @vote/ui lint
pnpm --filter @vote/ui build
pnpm test:all
```

Structural checks:

```bash
find ui/src/features -type f \( -name '*.tsx' -o -name '*.jsx' \) -print
rg -n "@/components" ui/src/features || true
```

Both structural checks must produce no violations.
