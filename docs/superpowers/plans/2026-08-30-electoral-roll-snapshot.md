# Electoral Roll Snapshot Implementation Plan

> **For agentic workers:** Follow the repository `AGENTS.md` policy. Execute inline in this session; do not invoke subagent execution skills unless the user explicitly requests them.

**Goal:** Allow an election commission to maintain an independent electoral roll, create an immutable revision snapshot, and attach that snapshot to a draft vote without later source-roll edits changing the vote electorate.

**Architecture:** `ElectoralRollAggregate` and its members are the editable source. `ElectoralRollSnapshotAggregate` captures immutable member values, revision, member count, and a canonical SHA-256 content hash. `VoteAggregate` references one snapshot, while existing `ElectorAggregate` rows remain vote-specific operational records and are materialized from snapshot members inside the attachment transaction.

**Tech Stack:** NestJS, TypeScript, MikroORM, PostgreSQL, Jest, Swagger

**Spec:** User requirements from 2026-08-30: create an electoral roll independently, snapshot it, connect the snapshot to a vote, and preserve that snapshot when the source roll changes.

## Global Constraints

- Only a `DRAFT` vote may attach or replace an electoral-roll snapshot.
- The vote and snapshot must belong to the same election commission.
- Snapshot records and snapshot members are immutable and have no update/delete API.
- A source roll mutation increments its revision in the same transaction as the member mutation.
- A snapshot is idempotently identified by `(electoral_roll_id, source_revision)`.
- Snapshot member data contains only business identifiers, group keys, and vote weights; no new raw CI, DI, phone, birth-date, or secret-ballot data is stored.
- Voting and identity-verification flows use vote-specific `electors`, never mutable source-roll members.
- Snapshot attachment materializes vote electors atomically and refuses to overwrite manually managed electors.
- Snapshot content hashes use canonical member ordering and SHA-256.

---

### Task 1: Domain model and invariants

**Files:**

- Create: `server/src/domain/electoral-roll/electoral-roll.aggregate.ts`
- Create: `server/src/domain/electoral-roll/electoral-roll-member.aggregate.ts`
- Create: `server/src/domain/electoral-roll/electoral-roll-snapshot.aggregate.ts`
- Modify: `server/src/domain/vote/vote.aggregate.ts`
- Test: `server/test/domain/electoral-roll/electoral-roll-domain.spec.ts`

**Interfaces:**

- Produces: `ElectoralRollAggregate.create()`, `rename()`, `markMembersChanged()`.
- Produces: validated `ElectoralRollMemberAggregate` with positive vote weight.
- Produces: immutable `ElectoralRollSnapshotAggregate` and snapshot-member values.
- Produces: `VoteAggregate.attachElectoralRollSnapshot(snapshotId)` restricted to `DRAFT`.

- [x] Add domain tests for blank names/identifiers, positive weights, revision increments, immutable snapshot values, and draft-only attachment.
- [x] Implement the domain types without NestJS or ORM imports.
- [x] Run the electoral-roll domain tests with Node 24.

### Task 2: Application commands, queries, and ports

**Files:**

- Create: `server/src/application/port/persistence/command/electoral-roll-repository.port.ts`
- Create: `server/src/application/port/persistence/command/electoral-roll-snapshot-repository.port.ts`
- Create: `server/src/application/port/persistence/query/electoral-roll-read-repository.port.ts`
- Create: command and handler files for create roll, add/update/remove member, create snapshot, and attach snapshot.
- Create: `server/src/application/query/get-electoral-roll.query.ts`
- Create: `server/src/application/query/handler/get-electoral-roll.handler.ts`
- Create: `server/src/application/query/view/electoral-roll.view.ts`
- Test: `server/test/application/command/handler/electoral-roll.handlers.spec.ts`
- Test: `server/test/application/query/handler/electoral-roll-query.handler.spec.ts`

**Interfaces:**

```ts
interface ElectoralRollRepositoryPort {
  nextId(): string;
  nextMemberId(): string;
  findById(id: string): Promise<ElectoralRollAggregate | undefined>;
  findMemberById(
    rollId: string,
    memberId: string,
  ): Promise<ElectoralRollMemberAggregate | undefined>;
  findMembersByRollId(
    rollId: string,
  ): Promise<readonly ElectoralRollMemberAggregate[]>;
  save(roll: ElectoralRollAggregate): Promise<void>;
  saveMember(member: ElectoralRollMemberAggregate): Promise<void>;
  removeMember(rollId: string, memberId: string): Promise<void>;
}

interface ElectoralRollSnapshotRepositoryPort {
  nextId(): string;
  nextMemberId(): string;
  findById(id: string): Promise<ElectoralRollSnapshotAggregate | undefined>;
  findBySourceRevision(
    rollId: string,
    revision: number,
  ): Promise<ElectoralRollSnapshotAggregate | undefined>;
  save(snapshot: ElectoralRollSnapshotAggregate): Promise<void>;
  hasVoteElectors(voteId: string): Promise<boolean>;
  materializeVoteElectors(voteId: string, snapshotId: string): Promise<void>;
}
```

- [x] Commands validate authoritative roll, member, snapshot, vote, and commission scope.
- [x] Member mutations use serializable transactions and increment the source revision.
- [x] Snapshot creation reads all source members in a repeatable transaction, sorts them canonically, and computes a SHA-256 hash.
- [x] Attachment is idempotent for the same snapshot, rejects manual electors, saves the vote link, and materializes electors in one transaction.
- [x] GET queries read only through a dedicated read repository.

### Task 3: Persistence schema and adapters

**Files:**

- Create: `server/src/infrastructure/database/entity/electoral-roll.entities.ts`
- Create: `server/src/infrastructure/database/repository/command/electoral-roll-repository.adapter.ts`
- Create: `server/src/infrastructure/database/repository/command/electoral-roll-snapshot-repository.adapter.ts`
- Create: `server/src/infrastructure/database/repository/query/electoral-roll-read-repository.adapter.ts`
- Create: `server/src/infrastructure/database/migration/Migration20260830000000.ts`
- Modify: entity registry, vote/elector entities, vote mapper/repository, provider wiring.
- Test: `server/test/infrastructure/database/repository/electoral-roll-repository.adapters.spec.ts`
- Test: `server/test/infrastructure/database/migration/electoral-roll-snapshot-migration.spec.ts`

**Schema:**

```text
electoral_rolls 1---* electoral_roll_members
electoral_rolls 1---* electoral_roll_snapshots 1---* electoral_roll_snapshot_members
electoral_roll_snapshots 1---* votes
electoral_roll_snapshot_members 1---* electors
```

- [x] Add unique constraints for `(roll_id, identifier)`, `(roll_id, source_revision)`, and `(snapshot_id, identifier)`.
- [x] Add non-negative revision/member-count and positive vote-weight checks.
- [x] Use `RESTRICT` from votes to snapshots and snapshot members to preserve audit history.
- [x] Implement explicit ORM/domain/read-model mapping.
- [x] Materialize electors from immutable snapshot members without consulting the mutable source roll.

### Task 4: HTTP API and module wiring

**Files:**

- Create: `server/src/presentation/route/electoral-roll/electoral-roll.controller.ts`
- Create: `server/src/presentation/route/electoral-roll/electoral-roll-read.controller.ts`
- Create: request/response DTOs under `server/src/presentation/route/electoral-roll/dto/`.
- Create: attach request/response DTOs under `server/src/presentation/route/vote/dto/`.
- Modify: `server/src/presentation/route/vote/vote.controller.ts`
- Modify: `server/src/app.module.ts` and module tests.
- Test: `server/test/presentation/route/electoral-roll/electoral-roll.controller.spec.ts`

**Routes:**

```text
POST   /electoral-rolls
GET    /electoral-rolls/:electoralRollId
PUT    /electoral-rolls/:electoralRollId/members
PATCH  /electoral-rolls/:electoralRollId/members/:memberId
DELETE /electoral-rolls/:electoralRollId/members/:memberId
POST   /electoral-rolls/:electoralRollId/snapshots
PUT    /votes/:voteId/electoral-roll-snapshot
```

- [x] Keep controllers limited to DTO/command/query mapping.
- [x] Return 404 for missing rolls, members, votes, and snapshots; 409 for scope/state conflicts.
- [x] Expose snapshot id on vote detail/summary read models.

### Task 5: Verification and review

- [x] Run focused domain, handler, adapter, migration, and controller tests with Node 24.
- [x] Run `git diff --check`.
- [x] Run the full Jest suite with Node 24 and confirm all suites pass.
- [x] Run the server build with Node 24.
- [x] Run ESLint without auto-fix and distinguish warnings from errors.
- [x] Review dependency direction, immutable snapshot behavior, commission scoping, overwrite protection, and PII/ballot secrecy.
- [x] Split the implementation plan and atomic feature implementation into separate commits.
