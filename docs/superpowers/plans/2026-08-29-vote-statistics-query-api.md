# Vote Statistics Query API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add vote-detail turnout and result query APIs with equal/share weighting and voting-channel breakdowns.

**Architecture:** HTTP controllers delegate to application query handlers. A dedicated read port is implemented by a MikroORM adapter that reads eligible electors, cast participations, candidates, and the `vote_results` projection without exposing ORM entities or secret ballot selections.

**Tech Stack:** NestJS, TypeScript, MikroORM, PostgreSQL, Jest

**Spec:** `ERD.md` sections `vote_participations`, `vote_results`, group voting, secret voting, and share voting

## Global Constraints

- Endpoints operate on one child vote because participation and result rows are keyed by `vote_detail_id`.
- Secret vote candidate totals come only from `vote_results`; elector-to-candidate linkage is never returned.
- `ELIGIBLE` electors form the turnout denominator; persisted `CAST` snapshots form participation and result numerators.
- A later elector status change does not retroactively remove a secret ballot because its candidate linkage is intentionally unavailable.
- Candidate results are available only after both parent and child votes are `CLOSED`.
- Casting persists participation and increments `vote_results` atomically.
- Percentages are numbers from 0 through 100, rounded to two decimal places; a zero denominator produces 0.
- Group voting counts distinct non-null group keys as eligible participation units.
- Group/share eligible weight counts one weight per group, relying on the documented same-weight-per-group invariant.

---

### Task 1: Application Query Contract

**Files:**

- Create: `server/src/application/port/vote-statistics-read-repository.port.ts`
- Create: `server/src/application/query/vote-turnout.view.ts`
- Create: `server/src/application/query/vote-result.view.ts`
- Create: `server/src/application/query/get-vote-turnout.query.ts`
- Create: `server/src/application/query/get-vote-turnout.handler.ts`
- Create: `server/src/application/query/get-vote-result.query.ts`
- Create: `server/src/application/query/get-vote-result.handler.ts`
- Test: `server/test/application/query/vote-statistics-query.handlers.spec.ts`

**Interfaces:**

- Consumes: `voteId: string`, `voteDetailId: string`
- Produces: `VoteTurnoutView`, `VoteResultView`, and `VoteStatisticsNotFoundError`

- [x] **Step 1: Write failing handler tests**

```typescript
await expect(
  handler.execute(GetVoteTurnoutQuery.of({ voteId, voteDetailId })),
).resolves.toBe(turnoutView);
await expect(
  handler.execute(GetVoteResultQuery.of({ voteId, voteDetailId })),
).resolves.toBe(resultView);
```

- [x] **Step 2: Run the focused test and confirm imports fail**

```bash
pnpm --filter @vote/server test -- --runInBand test/application/query/vote-statistics-query.handlers.spec.ts
```

- [x] **Step 3: Implement framework-free views, queries, port, and thin handlers**

```typescript
export interface VoteStatisticsReadRepositoryPort {
  getTurnout(
    voteId: string,
    voteDetailId: string,
  ): Promise<VoteTurnoutView | undefined>;
  getResult(
    voteId: string,
    voteDetailId: string,
  ): Promise<VoteResultView | undefined>;
}
```

- [x] **Step 4: Run the focused test and confirm it passes**

```bash
pnpm --filter @vote/server test -- --runInBand test/application/query/vote-statistics-query.handlers.spec.ts
```

### Task 2: PostgreSQL Statistics Read Adapter

**Files:**

- Create: `server/src/infrastructure/database/repository/vote-statistics-read-repository.adapter.ts`
- Modify: `server/src/infrastructure/database/database-repository.providers.ts`
- Test: `server/test/infrastructure/database/repository/vote-statistics-read-repository.adapter.spec.ts`

**Interfaces:**

- Consumes: `VoteStatisticsReadRepositoryPort`
- Produces: policy-aware turnout and candidate/channel result aggregates

- [x] **Step 1: Write failing adapter tests for equal, share, group, empty, and not-found results**

```typescript
expect(view?.weightedParticipationRate).toBe(60);
expect(view?.candidates[0].weightedVoteRate).toBe(75);
expect(view?.votingChannels).toEqual(
  expect.arrayContaining([{ channel: 'ONLINE', participantCount: 2 }]),
);
```

- [x] **Step 2: Run the focused test and confirm the adapter is missing**

```bash
pnpm --filter @vote/server test -- --runInBand test/infrastructure/database/repository/vote-statistics-read-repository.adapter.spec.ts
```

- [x] **Step 3: Implement database aggregation and provider registration**

```typescript
const rate = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : Math.round((numerator / denominator) * 10000) / 100;
```

- [x] **Step 4: Run the focused adapter test and confirm it passes**

```bash
pnpm --filter @vote/server test -- --runInBand test/infrastructure/database/repository/vote-statistics-read-repository.adapter.spec.ts
```

### Task 3: HTTP Endpoints and Module Wiring

**Files:**

- Create: `server/src/presentation/route/vote-statistics/dto/get-vote-statistics-request.dto.ts`
- Create: `server/src/presentation/route/vote-statistics/dto/get-vote-turnout-response.dto.ts`
- Create: `server/src/presentation/route/vote-statistics/dto/get-vote-result-response.dto.ts`
- Create: `server/src/presentation/route/vote-statistics/vote-statistics.controller.ts`
- Modify: `server/src/app.module.ts`
- Test: `server/test/presentation/route/vote-statistics/vote-statistics.controller.spec.ts`
- Test: `server/test/app.module.spec.ts`

**Interfaces:**

- Consumes: `GET /votes/:voteId/sub-votes/:voteDetailId/turnout` and `GET /votes/:voteId/sub-votes/:voteDetailId/results`
- Produces: Swagger-documented turnout and result responses

- [x] **Step 1: Write failing controller and module-registration tests**

```typescript
expect(await controller.getTurnout(params)).toEqual(
  GetVoteTurnoutResponse.of(view),
);
expect(await controller.getResult(params)).toEqual(
  GetVoteResultResponse.of(view),
);
```

- [x] **Step 2: Run focused tests and confirm missing HTTP types**

```bash
pnpm --filter @vote/server test -- --runInBand test/presentation/route/vote-statistics/vote-statistics.controller.spec.ts test/app.module.spec.ts
```

- [x] **Step 3: Implement DTO mapping, controller routes, and module providers**

```typescript
@Get('turnout')
getTurnout(@Param() params: GetVoteStatisticsParam): Promise<GetVoteTurnoutResponse>;

@Get('results')
getResult(@Param() params: GetVoteStatisticsParam): Promise<GetVoteResultResponse>;
```

- [x] **Step 4: Run focused tests and confirm they pass**

```bash
pnpm --filter @vote/server test -- --runInBand test/presentation/route/vote-statistics/vote-statistics.controller.spec.ts test/app.module.spec.ts
```

### Task 4: Result Projection Integrity And Visibility

**Files:**

- Modify: `server/src/application/command/cast-participation.handler.ts`
- Modify: `server/src/application/port/participation-repository.port.ts`
- Modify: `server/src/infrastructure/database/repository/participation-repository.adapter.ts`
- Modify: `server/src/application/query/get-vote-result.handler.ts`
- Modify: `server/src/application/query/vote-result.view.ts`
- Modify: `server/src/presentation/route/vote-statistics/vote-statistics.controller.ts`
- Test: `server/test/application/command/cast-participation.handler.spec.ts`
- Test: `server/test/vote-statistics.database.e2e-spec.ts`

**Interfaces:**

- Consumes: validated selected candidate and cast participation
- Produces: atomic participation/result persistence and closed-vote-only candidate results

- [x] **Step 1: Verify failing tests for missing result writes and premature result visibility**

```bash
pnpm --filter @vote/server test -- --runInBand test/application/command/cast-participation.handler.spec.ts test/application/query/vote-statistics-query.handlers.spec.ts
```

- [x] **Step 2: Persist participation and increment the selected candidate result in one transaction**

```typescript
saveCastWithResult(
  participation: ParticipationAggregate,
  selectedCandidateId: string,
): Promise<void>;
```

- [x] **Step 3: Reject candidate result queries until parent and child votes are closed**

```typescript
if (
  result.voteStatus !== VoteStatus.Closed ||
  result.voteDetailStatus !== VoteDetailStatus.Closed
) {
  throw new VoteResultUnavailableError();
}
```

- [x] **Step 4: Verify the SQL and transaction against PostgreSQL 16**

```bash
VOTE_STATISTICS_E2E_DATABASE=true \
DATABASE_HOST=127.0.0.1 \
DATABASE_PORT=55439 \
DATABASE_NAME=vote_statistics_test \
DATABASE_USER=vote \
DATABASE_PASSWORD=vote \
pnpm --filter @vote/server test:e2e --runInBand test/vote-statistics.database.e2e-spec.ts
```

### Task 5: Verification

**Files:**

- Verify: all changed production and test files

**Interfaces:**

- Consumes: completed query APIs
- Produces: passing test suite, build, and clean diff checks

- [x] **Step 1: Run all server tests**

```bash
pnpm --filter @vote/server test -- --runInBand
```

- [x] **Step 2: Build the server**

```bash
pnpm --filter @vote/server build
```

- [x] **Step 3: Check formatting and whitespace**

```bash
git diff --check
```
