# UI Electoral Roll API Integration Implementation Plan

> **For agentic workers:** Follow the repository `AGENTS.md` policy. Execute inline in this session; do not invoke subagent execution skills unless the user explicitly requests them. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose editable electoral rolls in the administrator UI and explain the automatic immutable revision snapshots supported by the current server contract.

**Architecture:** Add electoral-roll contracts, mock fixtures, an API client, and React Query options inside the existing vote feature. A dedicated authenticated `/electoral-rolls` route owns roll lookup and member mutation. Each changed revision is snapshotted server-side. Vote creation continues to submit its registered commission ID. Existing vote detail and elector management consume an optional snapshot identifier only when the server has already attached one.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack React Query 5, Vitest, Testing Library

**Spec:** `docs/superpowers/plans/2026-08-30-electoral-roll-snapshot.md`

## Global Constraints

- Vote creation submits `commissionId`; the current server does not expose a latest-snapshot lookup or automatic attachment contract.
- The electoral-roll screen does not create snapshots manually or link rolls to votes.
- Snapshot records and snapshot members are immutable and have no update/delete UI.
- The UI must not request or persist raw CI, DI, phone, birth-date, identity-provider tokens, or ballot selections in electoral rolls.
- React Query owns API state; feature UI files remain hookless.
- Mock mode must not call the vote or OIDC servers.
- Tests remain under `ui/test`; no runtime dependency is added.
- Do not create a commit unless the user asks.

---

### Task 1: Electoral-roll client contracts

**Files:**
- Create: `ui/src/features/votes/model/electoral-roll.types.ts`
- Create: `ui/src/features/votes/api/electoral-roll-fixtures.ts`
- Create: `ui/src/features/votes/api/electoral-roll-api.ts`
- Create: `ui/src/features/votes/api/electoral-roll-query-options.ts`
- Test: `ui/test/features/votes/api/electoral-roll-api.test.ts`

**Interfaces:**

```ts
interface ElectoralRollRecord {
  id: string;
  commissionId: string;
  name: string;
  revision: number;
  members: ElectoralRollMemberRecord[];
  createdAt: string;
  updatedAt: string;
}

interface ElectoralRollApiClient {
  fetchElectoralRoll(id: string): Promise<ElectoralRollRecord | null>;
  createElectoralRoll(input: CreateElectoralRollInput): Promise<CreateElectoralRollResult>;
  addMember(input: AddElectoralRollMemberInput): Promise<ManageElectoralRollMemberResult>;
  updateMember(input: UpdateElectoralRollMemberInput): Promise<ManageElectoralRollMemberResult>;
  removeMember(input: RemoveElectoralRollMemberInput): Promise<RemoveElectoralRollMemberResult>;
}
```

- [x] Add tests for source-roll routes, methods, encoded identifiers, request bodies, 404 lookup behavior, and response-envelope mapping.
- [x] Add a mock-mode test that mutates a roll and confirms revision snapshots are automatic and immutable.
- [x] Implement the typed live client against the electoral-roll source endpoints.
- [x] Implement mock fixtures with revision increments and immutable snapshot copies containing only identifier, group key, and vote weight.
- [x] Add query options keyed by API mode and electoral-roll ID.
- [x] Run `pnpm --filter @vote/ui test -- electoral-roll-api.test.ts`.

### Task 2: Electoral-roll management route

**Files:**
- Create: `ui/src/app/electoral-rolls/page.tsx`
- Create: `ui/src/features/votes/container/electoral-roll-management-container.tsx`
- Create: `ui/src/features/votes/ui/electoral-roll-management.tsx`
- Create: `ui/src/features/votes/ui/electoral-roll-member-section.tsx`
- Create: `ui/src/features/votes/ui/electoral-roll-snapshot-section.tsx`
- Modify: `ui/src/features/votes/ui/vote-navigation.tsx`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**

```ts
interface ElectoralRollManagementProps {
  roll: ElectoralRollRecord | null;
  selectedRollId: string;
  onLookup(id: string): void;
  onCreate(data: FormData): void;
  onAddMember(data: FormData): void;
  onUpdateMember(memberId: string, data: FormData): void;
  onRemoveMember(memberId: string): void;
}
```

- [x] Add an authenticated route with the existing mock/live session behavior.
- [x] Add navigation entry `선거인명부` with `current="electoral-rolls"`.
- [x] Implement ID lookup and independent roll creation forms.
- [x] Render revision and member count, plus add/update/remove member controls limited to identifier, group key, and positive vote weight.
- [x] Explain automatic revision snapshots without manual creation or vote-linking controls.
- [x] Wire roll mutations through the container and invalidate the selected roll after writes.
- [x] Test the mock create/member flow and verify neither snapshot creation nor vote-linking actions are exposed.

### Task 3: Vote DTO and managed-elector state

**Files:**
- Modify: `ui/src/features/votes/api/votes-api.ts`
- Modify: `ui/src/features/votes/api/votes-fixtures.ts`
- Modify: `ui/src/features/votes/model/vote.types.ts`
- Modify: `ui/src/features/votes/ui/vote-detail-summary.tsx`
- Modify: `ui/src/features/votes/container/elector-management-container.tsx`
- Modify: `ui/src/features/votes/ui/elector-management-view.tsx`
- Test: `ui/test/features/votes/api/votes-api.test.ts`
- Test: `ui/test/features/votes/container/vote-pages.test.tsx`

**Interfaces:**

```ts
interface VoteSummary {
  electoralRollSnapshotId?: string;
}

interface ElectorManagementViewProps {
  electoralRollSnapshotId?: string;
  // existing props unchanged
}
```

- [x] Assert `electoralRollSnapshotId` is preserved from server summary/detail DTOs.
- [x] Map the optional field into vote models and mock fixtures.
- [x] Display the immutable snapshot ID in vote detail when attached.
- [x] Load lightweight vote snapshot metadata alongside the operational elector page.
- [x] Disable manual elector creation and link to `/electoral-rolls` when a snapshot manages the vote electorate.
- [x] Keep manual registration unchanged when no snapshot is attached.

### Task 4: Documentation and verification

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-30-vote-admin-operations-screens-design.md`
- Restore: `ui/next-env.d.ts` to its tracked production type references if Next rewrites it during verification.

- [x] Document `/electoral-rolls`, automatic immutable revision snapshots, and the absence of vote-linking controls.
- [x] Run full UI tests and lint on Node 24.
- [x] Build in live and mock modes.
- [x] Run UI boundary checks and `git diff --check`.
- [x] Inspect the final diff and confirm the fast-forwarded server changes remain untouched.
