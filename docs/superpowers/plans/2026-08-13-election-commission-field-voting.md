# Election Commission Field Voting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add election commission ownership, parent-vote-level voting channels, onsite/visit field voting sessions, field participation, and field participation evidence contracts.

**Architecture:** Keep domain aggregates framework-free and enforce voting invariants in domain/application. Add command handlers and controller boundaries without `AppModule` wiring because this repository does not yet have repository adapters for vote resources. Add persistence entities, mappers, migrations, and ERD updates inside infrastructure/database without leaking ORM types into domain/application.

**Tech Stack:** Node 24, pnpm 9.15.9, NestJS 11, TypeScript, Jest, MikroORM 7, PostgreSQL.

## Global Constraints

- Run every command through Node 24: `source ~/.nvm/nvm.sh && nvm use 24 && <command>`.
- Dependency direction remains `presentation -> application -> domain` and `infrastructure -> application -> domain`.
- Domain must not import NestJS, ORM entities, HTTP exceptions, persistence, cache, storage, blockchain SDKs, or external service clients.
- Controllers stay thin and map request DTOs to command handlers only.
- Do not register new controllers or handlers in `AppModule` in this plan because repository adapters are not implemented.
- Application commands use `private constructor` plus `static of()`.
- Request DTOs stay in `presentation` and do not import application, domain, or infrastructure modules.
- Optional application, domain, and presentation values use `undefined`, not `null`.
- Secret votes must not persist `candidateId` or equivalent elector-to-choice linkage.
- Onsite and visit participation must reuse existing duplicate prevention and vote weight snapshot rules.
- Visit addresses, verification notes, signature contents, and raw identity values must not appear in domain events or audit payloads.
- Use TDD: write the failing test, run it and confirm the expected failure, implement the minimal code, then run the test again.

---

## File Structure

Create domain files:

- `server/src/domain/election-commission/type/election-commission-status.type.ts`: commission status constants.
- `server/src/domain/election-commission/type/election-commission-member-role.type.ts`: member role constants.
- `server/src/domain/election-commission/type/election-commission-member-status.type.ts`: member status constants.
- `server/src/domain/election-commission/election-commission.events.ts`: commission and member domain events.
- `server/src/domain/election-commission/election-commission.aggregate.ts`: commission aggregate.
- `server/src/domain/election-commission/election-commission-member.aggregate.ts`: commission member aggregate.
- `server/src/domain/vote/type/voting-channel.type.ts`: `ONLINE | ONSITE | VISIT`.
- `server/src/domain/field-voting/type/field-voting-session-status.type.ts`: session lifecycle status.
- `server/src/domain/field-voting/field-voting.events.ts`: session and evidence events.
- `server/src/domain/field-voting/field-voting-session.aggregate.ts`: onsite/visit session aggregate.
- `server/src/domain/field-voting/field-participation-evidence.aggregate.ts`: field evidence aggregate.

Modify domain files:

- `server/src/domain/vote/vote.aggregate.ts`: add `commissionId`, `votingChannels`, and `allowsVotingChannel()`.
- `server/src/domain/participation/participation.aggregate.ts`: add `votingChannel` and `fieldVotingSessionId`.
- `server/src/domain/index.ts`: export new domain types and aggregates.

Create application files:

- `server/src/application/port/election-commission-repository.port.ts`
- `server/src/application/port/election-commission-member-repository.port.ts`
- `server/src/application/port/field-voting-session-repository.port.ts`
- `server/src/application/port/participation-repository.port.ts`
- `server/src/application/port/field-participation-evidence-repository.port.ts`
- `server/src/application/port/file-repository.port.ts`
- `server/src/application/command/create-election-commission.command.ts`
- `server/src/application/command/create-election-commission.handler.ts`
- `server/src/application/command/register-election-commission-member.command.ts`
- `server/src/application/command/register-election-commission-member.handler.ts`
- `server/src/application/command/create-field-voting-session.command.ts`
- `server/src/application/command/create-field-voting-session.handler.ts`
- `server/src/application/command/open-field-voting-session.command.ts`
- `server/src/application/command/open-field-voting-session.handler.ts`
- `server/src/application/command/close-field-voting-session.command.ts`
- `server/src/application/command/close-field-voting-session.handler.ts`
- `server/src/application/command/cancel-field-voting-session.command.ts`
- `server/src/application/command/cancel-field-voting-session.handler.ts`
- `server/src/application/command/cast-participation.command.ts`
- `server/src/application/command/cast-participation.handler.ts`
- `server/src/application/command/record-field-participation-evidence.command.ts`
- `server/src/application/command/record-field-participation-evidence.handler.ts`

Modify application files:

- `server/src/application/command/create-vote.command.ts`: add `commissionId` and `votingChannels`.
- `server/src/application/command/create-vote.handler.ts`: load active commission and create vote with channels.
- `server/src/application/port/vote-repository.port.ts`: add `findById(voteId: string)`.
- `server/src/application/port/vote-detail-repository.port.ts`: add `findById(voteDetailId: string)`.

Create presentation files:

- `server/src/presentation/route/election-commission/election-commission.controller.ts`
- `server/src/presentation/route/election-commission/dto/create-election-commission-request.dto.ts`
- `server/src/presentation/route/election-commission/dto/create-election-commission-response.dto.ts`
- `server/src/presentation/route/election-commission/dto/register-election-commission-member-request.dto.ts`
- `server/src/presentation/route/election-commission/dto/register-election-commission-member-response.dto.ts`
- `server/src/presentation/route/field-voting-session/field-voting-session.controller.ts`
- `server/src/presentation/route/field-voting-session/dto/create-field-voting-session-request.dto.ts`
- `server/src/presentation/route/field-voting-session/dto/create-field-voting-session-response.dto.ts`
- `server/src/presentation/route/field-voting-session/dto/change-field-voting-session-status-request.dto.ts`
- `server/src/presentation/route/field-voting-session/dto/change-field-voting-session-status-response.dto.ts`
- `server/src/presentation/route/participation/dto/cast-participation-request.dto.ts`
- `server/src/presentation/route/participation/dto/cast-participation-response.dto.ts`
- `server/src/presentation/route/participation/dto/record-field-participation-evidence-request.dto.ts`
- `server/src/presentation/route/participation/dto/record-field-participation-evidence-response.dto.ts`

Modify presentation files:

- `server/src/presentation/route/vote/dto/create-vote-request.dto.ts`
- `server/src/presentation/route/vote/dto/create-vote-response.dto.ts`
- `server/src/presentation/route/vote/vote.controller.ts`
- `server/src/presentation/route/participation/participation.controller.ts`

Create or modify persistence files:

- `server/src/infrastructure/database/mapper/election-commission.mapper.ts`
- `server/src/infrastructure/database/mapper/election-commission-member.mapper.ts`
- `server/src/infrastructure/database/mapper/field-voting-session.mapper.ts`
- `server/src/infrastructure/database/mapper/field-participation-evidence.mapper.ts`
- `server/src/infrastructure/database/migration/Migration20260813000000.ts`
- `server/src/infrastructure/database/entity/type/database-enum.type.ts`
- `server/src/infrastructure/database/entity/index.ts`
- `server/src/infrastructure/database/mapper/vote.mapper.ts`
- `server/src/infrastructure/database/mapper/participation.mapper.ts`
- `ERD.md`

---

### Task 1: Election Commission Domain Foundation

**Files:**
- Create: `server/test/domain/election-commission/election-commission-domain.spec.ts`
- Create: `server/src/domain/election-commission/type/election-commission-status.type.ts`
- Create: `server/src/domain/election-commission/type/election-commission-member-role.type.ts`
- Create: `server/src/domain/election-commission/type/election-commission-member-status.type.ts`
- Create: `server/src/domain/election-commission/election-commission.events.ts`
- Create: `server/src/domain/election-commission/election-commission.aggregate.ts`
- Create: `server/src/domain/election-commission/election-commission-member.aggregate.ts`
- Create: `server/src/domain/vote/type/voting-channel.type.ts`
- Modify: `server/src/domain/index.ts`
- Modify: `server/test/domain/type/domain-type-constants.spec.ts`

**Interfaces:**
- Produces: `ElectionCommissionStatus.Active = 'ACTIVE'`, `ElectionCommissionStatus.Suspended = 'SUSPENDED'`.
- Produces: `ElectionCommissionMemberRole.Admin = 'ADMIN'`, `ElectionCommissionMemberRole.FieldManager = 'FIELD_MANAGER'`.
- Produces: `ElectionCommissionMemberStatus.Active = 'ACTIVE'`, `ElectionCommissionMemberStatus.Inactive = 'INACTIVE'`.
- Produces: `VotingChannel.Online = 'ONLINE'`, `VotingChannel.Onsite = 'ONSITE'`, `VotingChannel.Visit = 'VISIT'`.
- Produces: `ElectionCommissionAggregate.create(params)` and `ElectionCommissionAggregate.reconstitute(params)`.
- Produces: `ElectionCommissionMemberAggregate.create(params)` and `ElectionCommissionMemberAggregate.reconstitute(params)`.
- Produces: `ElectionCommissionAggregate.canRunVote(): boolean`.
- Produces: `ElectionCommissionMemberAggregate.canManageFieldVoting(commissionId: string): boolean`.

- [ ] **Step 1: Write the failing domain tests**

Create `server/test/domain/election-commission/election-commission-domain.spec.ts`:

```typescript
import { DomainError } from '../../../src/domain/shared/domain-error';
import { ElectionCommissionAggregate } from '../../../src/domain/election-commission/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../src/domain/election-commission/election-commission-member.aggregate';
import {
  ElectionCommissionCreated,
  ElectionCommissionMemberRegistered,
} from '../../../src/domain/election-commission/election-commission.events';
import { ElectionCommissionStatus } from '../../../src/domain/election-commission/type/election-commission-status.type';
import { ElectionCommissionMemberRole } from '../../../src/domain/election-commission/type/election-commission-member-role.type';
import { ElectionCommissionMemberStatus } from '../../../src/domain/election-commission/type/election-commission-member-status.type';
import { VotingChannel } from '../../../src/domain/vote/type/voting-channel.type';

describe('election commission domain', () => {
  it('creates an active election commission and emits an event', () => {
    const commission = ElectionCommissionAggregate.create({
      id: 'commission-1',
      name: 'Main Election Commission',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    expect(commission).toMatchObject({
      id: 'commission-1',
      name: 'Main Election Commission',
      status: ElectionCommissionStatus.Active,
    });
    expect(commission.canRunVote()).toBe(true);
    expect(commission.pullEvents()[0]).toBeInstanceOf(
      ElectionCommissionCreated,
    );
  });

  it('rejects an empty commission name', () => {
    expect(() =>
      ElectionCommissionAggregate.create({
        id: 'commission-2',
        name: '   ',
        createdAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('suspends and reactivates a commission', () => {
    const commission = ElectionCommissionAggregate.create({
      id: 'commission-3',
      name: 'Regional Commission',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    commission.suspend(new Date('2026-08-14T00:00:00.000Z'));
    expect(commission.status).toBe(ElectionCommissionStatus.Suspended);
    expect(commission.canRunVote()).toBe(false);

    commission.reactivate(new Date('2026-08-15T00:00:00.000Z'));
    expect(commission.status).toBe(ElectionCommissionStatus.Active);
    expect(commission.canRunVote()).toBe(true);
  });

  it('registers an active field manager for a commission', () => {
    const member = ElectionCommissionMemberAggregate.create({
      id: 'member-1',
      commissionId: 'commission-1',
      name: 'Kim Manager',
      role: ElectionCommissionMemberRole.FieldManager,
      registeredAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    expect(member).toMatchObject({
      id: 'member-1',
      commissionId: 'commission-1',
      name: 'Kim Manager',
      role: ElectionCommissionMemberRole.FieldManager,
      status: ElectionCommissionMemberStatus.Active,
    });
    expect(member.canManageFieldVoting('commission-1')).toBe(true);
    expect(member.canManageFieldVoting('commission-other')).toBe(false);
    expect(member.pullEvents()[0]).toBeInstanceOf(
      ElectionCommissionMemberRegistered,
    );
  });

  it('exposes voting channel runtime constants', () => {
    expect(Object.values(VotingChannel)).toEqual([
      'ONLINE',
      'ONSITE',
      'VISIT',
    ]);
  });
});
```

- [ ] **Step 2: Update the existing type constants test**

Add these assertions to `server/test/domain/type/domain-type-constants.spec.ts`:

```typescript
expect(Object.values(ElectionCommissionStatus)).toEqual([
  'ACTIVE',
  'SUSPENDED',
]);
expect(Object.values(ElectionCommissionMemberRole)).toEqual([
  'ADMIN',
  'FIELD_MANAGER',
]);
expect(Object.values(ElectionCommissionMemberStatus)).toEqual([
  'ACTIVE',
  'INACTIVE',
]);
expect(Object.values(VotingChannel)).toEqual(['ONLINE', 'ONSITE', 'VISIT']);
```

- [ ] **Step 3: Run tests to verify the expected failures**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand election-commission-domain.spec.ts domain/type/domain-type-constants.spec.ts
```

Expected: FAIL with missing module errors for the new election commission and voting channel files.

- [ ] **Step 4: Implement the domain types**

Create the type files with this shape:

```typescript
export const ElectionCommissionStatus = {
  Active: 'ACTIVE',
  Suspended: 'SUSPENDED',
} as const;

export type ElectionCommissionStatus =
  (typeof ElectionCommissionStatus)[keyof typeof ElectionCommissionStatus];
```

Use the same constant/type pattern for `ElectionCommissionMemberRole`, `ElectionCommissionMemberStatus`, and `VotingChannel`.

- [ ] **Step 5: Implement events and aggregates**

Use the existing `DomainEvent` pattern:

```typescript
export class ElectionCommissionCreated extends DomainEvent {
  readonly type = 'ElectionCommissionCreated' as const;

  private constructor(aggregateId: string, occurredAt: Date) {
    super(aggregateId, occurredAt);
  }

  static of(params: DomainEventProps): ElectionCommissionCreated {
    return new ElectionCommissionCreated(params.aggregateId, params.occurredAt);
  }
}
```

Implement `ElectionCommissionAggregate` with this constructor shape:

```typescript
private constructor(
  readonly id: string,
  readonly name: string,
  public status: ElectionCommissionStatus,
  readonly createdAt: Date,
) {}
```

Implement `ElectionCommissionMemberAggregate` with this constructor shape:

```typescript
private constructor(
  readonly id: string,
  readonly commissionId: string,
  readonly name: string,
  readonly role: ElectionCommissionMemberRole,
  public status: ElectionCommissionMemberStatus,
) {}
```

Both aggregates must trim names, reject empty names with `DomainError`, and use `createId()` for ids.

- [ ] **Step 6: Export the new domain files**

Add exports to `server/src/domain/index.ts`:

```typescript
export * from './vote/type/voting-channel.type';
export * from './election-commission/type/election-commission-status.type';
export * from './election-commission/type/election-commission-member-role.type';
export * from './election-commission/type/election-commission-member-status.type';
export * from './election-commission/election-commission.events';
export * from './election-commission/election-commission.aggregate';
export * from './election-commission/election-commission-member.aggregate';
```

- [ ] **Step 7: Run tests to verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand election-commission-domain.spec.ts domain/type/domain-type-constants.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/src/domain server/test/domain
git commit -m "feat(server): add election commission domain"
```

---

### Task 2: Parent Vote Commission Ownership And Voting Channels

**Files:**
- Modify: `server/src/domain/vote/vote.aggregate.ts`
- Modify: `server/src/application/command/create-vote.command.ts`
- Modify: `server/src/application/command/create-vote.handler.ts`
- Modify: `server/src/application/port/vote-repository.port.ts`
- Create: `server/src/application/port/election-commission-repository.port.ts`
- Modify: `server/src/presentation/route/vote/dto/create-vote-request.dto.ts`
- Modify: `server/src/presentation/route/vote/dto/create-vote-response.dto.ts`
- Modify: `server/src/presentation/route/vote/vote.controller.ts`
- Modify: `server/test/domain/vote/vote-domain.spec.ts`
- Modify: `server/test/domain/aggregate-reconstitution.spec.ts`
- Modify: `server/test/application/command/create-vote.handler.spec.ts`
- Modify: `server/test/presentation/route/vote/vote.controller.spec.ts`
- Modify: `server/test/infrastructure/database/mapper/database-mappers.spec.ts`

**Interfaces:**
- Updates: `VoteAggregate.create({ id, commissionId, title, votingChannels, defaultPolicy, identityVerificationPolicy, status? })`.
- Updates: `VoteAggregate.reconstitute()` with required `commissionId` and `votingChannels`.
- Produces: `VoteAggregate.allowsVotingChannel(channel: VotingChannel): boolean`.
- Updates: `CreateVoteCommand.of({ commissionId, title, votingChannels, defaultPolicy, identityVerificationPolicy })`.
- Updates: `CreateVoteResult = { id: string; commissionId: string; status: VoteStatus }`.
- Produces: `ElectionCommissionRepositoryPort` with `nextId()`, `findById(commissionId)`, and `save(commission)`.

- [ ] **Step 1: Write failing vote domain tests**

Add to `server/test/domain/vote/vote-domain.spec.ts`:

```typescript
import { VotingChannel } from '../../../src/domain/vote/type/voting-channel.type';

it('requires commission id and at least one voting channel', () => {
  expect(() =>
    VoteAggregate.create({
      id: 'vote-channels-1',
      commissionId: 'commission-1',
      title: 'Field vote',
      votingChannels: [],
      defaultPolicy: VotePolicy.of({
        privacyMode: PrivacyMode.Secret,
        participationUnit: ParticipationUnit.Individual,
        resultStorageMode: ResultStorageMode.Database,
        voteWeightMode: VoteWeightMode.Equal,
      }),
      identityVerificationPolicy: IdentityVerificationPolicy.of({
        required: false,
      }),
      status: VoteStatus.Draft,
    }),
  ).toThrow(DomainError);
});

it('checks parent-vote-level voting channel allowance', () => {
  const vote = VoteAggregate.create({
    id: 'vote-channels-2',
    commissionId: 'commission-1',
    title: 'Hybrid vote',
    votingChannels: [VotingChannel.Online, VotingChannel.Onsite],
    defaultPolicy: VotePolicy.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Individual,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Equal,
    }),
    identityVerificationPolicy: IdentityVerificationPolicy.of({
      required: false,
    }),
    status: VoteStatus.Draft,
  });

  expect(vote.commissionId).toBe('commission-1');
  expect(vote.votingChannels).toEqual([
    VotingChannel.Online,
    VotingChannel.Onsite,
  ]);
  expect(vote.allowsVotingChannel(VotingChannel.Onsite)).toBe(true);
  expect(vote.allowsVotingChannel(VotingChannel.Visit)).toBe(false);
});
```

- [ ] **Step 2: Write failing handler and controller tests**

Update `server/test/application/command/create-vote.handler.spec.ts` so the handler is constructed with an election commission repository:

```typescript
const commissionRepository: ElectionCommissionRepositoryPort = {
  nextId: jest.fn().mockReturnValue('commission-unused'),
  findById: jest.fn().mockResolvedValue(
    ElectionCommissionAggregate.create({
      id: 'commission-1',
      name: 'Main Commission',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    }),
  ),
  save: jest.fn().mockResolvedValue(undefined),
};
const handler = new CreateVoteHandler(repository, commissionRepository);
```

Update the command call:

```typescript
CreateVoteCommand.of({
  commissionId: 'commission-1',
  title: 'Board election',
  votingChannels: [VotingChannel.Online, VotingChannel.Onsite],
  defaultPolicy: {
    privacyMode: PrivacyMode.Secret,
    participationUnit: ParticipationUnit.Individual,
    resultStorageMode: ResultStorageMode.Database,
    voteWeightMode: VoteWeightMode.Equal,
  },
  identityVerificationPolicy: {
    required: false,
  },
});
```

Expect the result to include `commissionId`:

```typescript
expect(result).toEqual({
  id: 'vote-1',
  commissionId: 'commission-1',
  status: VoteStatus.Draft,
});
```

Update `server/test/presentation/route/vote/vote.controller.spec.ts` body with `commissionId` and `votingChannels`, and assert the command matches them.

- [ ] **Step 3: Run tests to verify expected failures**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand domain/vote/vote-domain.spec.ts application/command/create-vote.handler.spec.ts presentation/route/vote/vote.controller.spec.ts
```

Expected: FAIL because `VoteAggregate`, `CreateVoteCommand`, and `CreateVoteHandler` do not accept the new fields.

- [ ] **Step 4: Update `VoteAggregate`**

Add fields and helpers:

```typescript
readonly commissionId: string,
readonly votingChannels: readonly VotingChannel[],
```

Add validation:

```typescript
private static assertVotingChannels(
  votingChannels: readonly VotingChannel[],
): void {
  if (votingChannels.length === 0) {
    throw new DomainError('vote must allow at least one voting channel');
  }
}

allowsVotingChannel(channel: VotingChannel): boolean {
  return this.votingChannels.includes(channel);
}
```

Call `createId(params.commissionId)` and copy `votingChannels` into a new array in the private constructor call.

- [ ] **Step 5: Update command, handler, and repository port**

Update `CreateVoteCommand` constructor parameters:

```typescript
readonly commissionId: string,
readonly title: string,
readonly votingChannels: readonly VotingChannel[],
readonly defaultPolicy: VotePolicyProps,
readonly identityVerificationPolicy: IdentityVerificationPolicyProps,
```

Create `ElectionCommissionRepositoryPort`:

```typescript
import type { ElectionCommissionAggregate } from '../../domain/election-commission/election-commission.aggregate';

export const ELECTION_COMMISSION_REPOSITORY_PORT = Symbol(
  'ELECTION_COMMISSION_REPOSITORY_PORT',
);

export interface ElectionCommissionRepositoryPort {
  nextId(): string;
  findById(
    commissionId: string,
  ): Promise<ElectionCommissionAggregate | undefined>;
  save(commission: ElectionCommissionAggregate): Promise<void>;
}
```

Inject it into `CreateVoteHandler`, load the commission, reject missing or suspended commissions, and pass `commissionId` plus `votingChannels` to `VoteAggregate.create()`.

- [ ] **Step 6: Update presentation DTO and controller**

Add `commissionId` and `votingChannels` to `CreateVoteBody`:

```typescript
class VotingChannelBody {
  @ApiProperty({
    enum: ['ONLINE', 'ONSITE', 'VISIT'],
    example: 'ONLINE',
    description: '부모 투표에서 허용하는 투표 채널입니다.',
  })
  readonly channel!: 'ONLINE' | 'ONSITE' | 'VISIT';
}
```

Use a plain array field in `CreateVoteBody`:

```typescript
@ApiProperty({
  example: 'commission-1',
  description: '투표를 주관하는 선거관리위원회 ID입니다.',
})
readonly commissionId!: string;

@ApiProperty({
  enum: ['ONLINE', 'ONSITE', 'VISIT'],
  isArray: true,
  example: ['ONLINE', 'ONSITE'],
  description: '부모 투표 단위로 허용하는 투표 채널입니다.',
})
readonly votingChannels!: Array<'ONLINE' | 'ONSITE' | 'VISIT'>;
```

Pass both fields into `CreateVoteCommand.of()` from `VoteController`.

- [ ] **Step 7: Update existing vote construction sites**

Search:

```bash
rg -n "VoteAggregate\\.create|VoteAggregate\\.reconstitute|CreateVoteCommand\\.of|VoteMapper\\.toDomain" server/src server/test
```

Add `commissionId: 'commission-1'` and `votingChannels: [VotingChannel.Online]` to test fixtures that create a vote. Update `VoteMapper.toDomain()` tests to include a `commission: { id: 'commission-1' }` relation and `votingChannels: [{ channel: VotingChannel.Online }]`.

- [ ] **Step 8: Run focused tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand domain/vote/vote-domain.spec.ts domain/aggregate-reconstitution.spec.ts application/command/create-vote.handler.spec.ts presentation/route/vote/vote.controller.spec.ts infrastructure/database/mapper/database-mappers.spec.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add server/src/domain server/src/application server/src/presentation server/test
git commit -m "feat(server): require commission and channels for votes"
```

---

### Task 3: Field Voting Session Domain

**Files:**
- Create: `server/test/domain/field-voting/field-voting-session-domain.spec.ts`
- Create: `server/src/domain/field-voting/type/field-voting-session-status.type.ts`
- Create: `server/src/domain/field-voting/field-voting.events.ts`
- Create: `server/src/domain/field-voting/field-voting-session.aggregate.ts`
- Modify: `server/src/domain/index.ts`
- Modify: `server/test/domain/type/domain-type-constants.spec.ts`

**Interfaces:**
- Produces: `FieldVotingSessionStatus.Scheduled = 'SCHEDULED'`, `Open = 'OPEN'`, `Closed = 'CLOSED'`, `Canceled = 'CANCELED'`.
- Produces: `FieldVotingSessionAggregate.schedule(params)`.
- Produces: `FieldVotingSessionAggregate.reconstitute(params)`.
- Produces: `open(openedAt: Date)`, `close(closedAt: Date)`, `cancel(canceledAt: Date)`.
- Produces: `hasAssignedManager(memberId: string): boolean`.

- [ ] **Step 1: Write failing field voting session tests**

Create `server/test/domain/field-voting/field-voting-session-domain.spec.ts`:

```typescript
import { ElectionCommissionAggregate } from '../../../src/domain/election-commission/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../src/domain/election-commission/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../src/domain/election-commission/type/election-commission-member-role.type';
import { DomainError } from '../../../src/domain/shared/domain-error';
import { FieldVotingSessionAggregate } from '../../../src/domain/field-voting/field-voting-session.aggregate';
import {
  FieldVotingSessionClosed,
  FieldVotingSessionOpened,
  FieldVotingSessionScheduled,
} from '../../../src/domain/field-voting/field-voting.events';
import { FieldVotingSessionStatus } from '../../../src/domain/field-voting/type/field-voting-session-status.type';
import { VotingChannel } from '../../../src/domain/vote/type/voting-channel.type';
import { VoteAggregate } from '../../../src/domain/vote/vote.aggregate';
import { VotePolicy } from '../../../src/domain/vote/vo/vote-policy.vo';
import { IdentityVerificationPolicy } from '../../../src/domain/vote/vo/identity-verification-policy.vo';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../src/domain/vote/type/vote-status.type';

function createCommission(): ElectionCommissionAggregate {
  return ElectionCommissionAggregate.create({
    id: 'commission-1',
    name: 'Main Commission',
    createdAt: new Date('2026-08-13T00:00:00.000Z'),
  });
}

function createManager(): ElectionCommissionMemberAggregate {
  return ElectionCommissionMemberAggregate.create({
    id: 'member-1',
    commissionId: 'commission-1',
    name: 'Kim Manager',
    role: ElectionCommissionMemberRole.FieldManager,
    registeredAt: new Date('2026-08-13T00:00:00.000Z'),
  });
}

function createVote(
  votingChannels = [VotingChannel.Online, VotingChannel.Onsite],
): VoteAggregate {
  return VoteAggregate.create({
    id: 'vote-1',
    commissionId: 'commission-1',
    title: 'Hybrid vote',
    votingChannels,
    defaultPolicy: VotePolicy.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Individual,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Equal,
    }),
    identityVerificationPolicy: IdentityVerificationPolicy.of({
      required: false,
    }),
    status: VoteStatus.Draft,
  });
}

describe('field voting session domain', () => {
  it('schedules an onsite field voting session for an active commission and manager', () => {
    const session = FieldVotingSessionAggregate.schedule({
      id: 'session-1',
      commission: createCommission(),
      vote: createVote(),
      channel: VotingChannel.Onsite,
      title: 'Lobby voting desk',
      locationName: 'Main Lobby',
      address: 'Seoul Office',
      managers: [createManager()],
      startsAt: new Date('2026-08-20T00:00:00.000Z'),
      endsAt: new Date('2026-08-20T09:00:00.000Z'),
      scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    expect(session).toMatchObject({
      id: 'session-1',
      commissionId: 'commission-1',
      voteId: 'vote-1',
      channel: VotingChannel.Onsite,
      status: FieldVotingSessionStatus.Scheduled,
    });
    expect(session.hasAssignedManager('member-1')).toBe(true);
    expect(session.pullEvents()[0]).toBeInstanceOf(
      FieldVotingSessionScheduled,
    );
  });

  it('rejects online field voting sessions', () => {
    expect(() =>
      FieldVotingSessionAggregate.schedule({
        id: 'session-online',
        commission: createCommission(),
        vote: createVote([VotingChannel.Online]),
        channel: VotingChannel.Online,
        title: 'Invalid',
        locationName: 'Main Lobby',
        address: 'Seoul Office',
        managers: [createManager()],
        startsAt: new Date('2026-08-20T00:00:00.000Z'),
        endsAt: new Date('2026-08-20T09:00:00.000Z'),
        scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('rejects a field session when the parent vote does not allow the channel', () => {
    expect(() =>
      FieldVotingSessionAggregate.schedule({
        id: 'session-visit',
        commission: createCommission(),
        vote: createVote([VotingChannel.Online]),
        channel: VotingChannel.Visit,
        title: 'Visit voting',
        locationName: 'Visit route A',
        address: 'Private address',
        managers: [createManager()],
        startsAt: new Date('2026-08-20T00:00:00.000Z'),
        endsAt: new Date('2026-08-20T09:00:00.000Z'),
        scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('opens and closes through valid transitions', () => {
    const session = FieldVotingSessionAggregate.schedule({
      id: 'session-2',
      commission: createCommission(),
      vote: createVote(),
      channel: VotingChannel.Onsite,
      title: 'Lobby voting desk',
      locationName: 'Main Lobby',
      address: 'Seoul Office',
      managers: [createManager()],
      startsAt: new Date('2026-08-20T00:00:00.000Z'),
      endsAt: new Date('2026-08-20T09:00:00.000Z'),
      scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    session.pullEvents();
    session.open(new Date('2026-08-20T00:00:00.000Z'));
    session.close(new Date('2026-08-20T09:00:00.000Z'));

    expect(session.status).toBe(FieldVotingSessionStatus.Closed);
    expect(session.pullEvents().map((event) => event.constructor)).toEqual([
      FieldVotingSessionOpened,
      FieldVotingSessionClosed,
    ]);
  });
});
```

- [ ] **Step 2: Add status constants test**

Add to `server/test/domain/type/domain-type-constants.spec.ts`:

```typescript
expect(Object.values(FieldVotingSessionStatus)).toEqual([
  'SCHEDULED',
  'OPEN',
  'CLOSED',
  'CANCELED',
]);
```

- [ ] **Step 3: Run tests to verify expected failures**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand field-voting-session-domain.spec.ts domain/type/domain-type-constants.spec.ts
```

Expected: FAIL with missing `FieldVotingSessionAggregate` and status type modules.

- [ ] **Step 4: Implement field voting status, events, and aggregate**

Implement `FieldVotingSessionAggregate.schedule()` with this parameter shape:

```typescript
interface ScheduleFieldVotingSessionParams {
  readonly id: string;
  readonly commission: ElectionCommissionAggregate;
  readonly vote: VoteAggregate;
  readonly channel: VotingChannel;
  readonly title: string;
  readonly locationName: string;
  readonly address: string;
  readonly managers: readonly ElectionCommissionMemberAggregate[];
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly scheduledAt: Date;
}
```

Validation messages:

```typescript
throw new DomainError('field voting session channel must be onsite or visit');
throw new DomainError('vote does not allow requested field voting channel');
throw new DomainError('commission is not active');
throw new DomainError('field voting session requires an active manager');
throw new DomainError('field voting session start must be before end');
```

Implement state transitions with these messages:

```typescript
throw new DomainError('only scheduled field voting sessions can be opened');
throw new DomainError('only open field voting sessions can be closed');
throw new DomainError('only scheduled or open field voting sessions can be canceled');
```

- [ ] **Step 5: Export the field voting domain**

Add to `server/src/domain/index.ts`:

```typescript
export * from './field-voting/type/field-voting-session-status.type';
export * from './field-voting/field-voting.events';
export * from './field-voting/field-voting-session.aggregate';
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand field-voting-session-domain.spec.ts domain/type/domain-type-constants.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/domain server/test/domain
git commit -m "feat(server): add field voting session domain"
```

---

### Task 4: Field Voting Session Application Commands

**Files:**
- Create: `server/test/application/command/create-field-voting-session.handler.spec.ts`
- Create: `server/test/application/command/election-commission-command.handlers.spec.ts`
- Create: `server/test/application/command/change-field-voting-session-status.handler.spec.ts`
- Create: `server/src/application/port/election-commission-member-repository.port.ts`
- Create: `server/src/application/port/field-voting-session-repository.port.ts`
- Create: `server/src/application/command/create-election-commission.command.ts`
- Create: `server/src/application/command/create-election-commission.handler.ts`
- Create: `server/src/application/command/register-election-commission-member.command.ts`
- Create: `server/src/application/command/register-election-commission-member.handler.ts`
- Create: `server/src/application/command/create-field-voting-session.command.ts`
- Create: `server/src/application/command/create-field-voting-session.handler.ts`
- Create: `server/src/application/command/open-field-voting-session.command.ts`
- Create: `server/src/application/command/open-field-voting-session.handler.ts`
- Create: `server/src/application/command/close-field-voting-session.command.ts`
- Create: `server/src/application/command/close-field-voting-session.handler.ts`
- Create: `server/src/application/command/cancel-field-voting-session.command.ts`
- Create: `server/src/application/command/cancel-field-voting-session.handler.ts`
- Modify: `server/src/application/port/vote-repository.port.ts`

**Interfaces:**
- Produces: `ElectionCommissionMemberRepositoryPort.findByIds(commissionId: string, memberIds: readonly string[]): Promise<ElectionCommissionMemberAggregate[]>`.
- Produces: `FieldVotingSessionRepositoryPort.nextId()`, `findById(sessionId)`, `save(session)`.
- Updates: `VoteRepositoryPort.findById(voteId: string): Promise<VoteAggregate | undefined>`.
- Produces: `CreateElectionCommissionHandler.execute(command): Promise<{ id; status }>` where status is `ElectionCommissionStatus`.
- Produces: `RegisterElectionCommissionMemberHandler.execute(command): Promise<{ id; commissionId; status }>` where status is `ElectionCommissionMemberStatus`.
- Produces: `CreateFieldVotingSessionHandler.execute(command): Promise<{ id; voteId; status }>` where status is `FieldVotingSessionStatus`.

- [ ] **Step 1: Write failing election commission command handler tests**

Create `server/test/application/command/election-commission-command.handlers.spec.ts`:

```typescript
describe('election commission command handlers', () => {
  it('creates an active election commission', async () => {
    const save = jest.fn<Promise<void>, [ElectionCommissionAggregate]>()
      .mockResolvedValue(undefined);
    const handler = new CreateElectionCommissionHandler({
      nextId: jest.fn().mockReturnValue('commission-1'),
      findById: jest.fn().mockResolvedValue(undefined),
      save,
    });

    const result = await handler.execute(
      CreateElectionCommissionCommand.of({
        name: 'Main Commission',
        createdAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'commission-1',
      status: ElectionCommissionStatus.Active,
    });
    expect(save.mock.calls[0][0]).toBeInstanceOf(ElectionCommissionAggregate);
  });

  it('registers an active commission member for an active commission', async () => {
    const commission = ElectionCommissionAggregate.create({
      id: 'commission-1',
      name: 'Main Commission',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    });
    const save = jest.fn<Promise<void>, [ElectionCommissionMemberAggregate]>()
      .mockResolvedValue(undefined);
    const handler = new RegisterElectionCommissionMemberHandler(
      {
        nextId: jest.fn().mockReturnValue('commission-unused'),
        findById: jest.fn().mockResolvedValue(commission),
        save: jest.fn(),
      },
      {
        nextId: jest.fn().mockReturnValue('member-1'),
        findByIds: jest.fn().mockResolvedValue([]),
        save,
      },
    );

    const result = await handler.execute(
      RegisterElectionCommissionMemberCommand.of({
        commissionId: 'commission-1',
        name: 'Kim Manager',
        role: ElectionCommissionMemberRole.FieldManager,
        registeredAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'member-1',
      commissionId: 'commission-1',
      status: ElectionCommissionMemberStatus.Active,
    });
    expect(save.mock.calls[0][0]).toBeInstanceOf(
      ElectionCommissionMemberAggregate,
    );
  });
});
```

- [ ] **Step 2: Write failing create field voting session handler test**

Create `server/test/application/command/create-field-voting-session.handler.spec.ts` with a valid create test:

```typescript
describe('CreateFieldVotingSessionHandler', () => {
  it('schedules a field voting session from authoritative repositories', async () => {
    const commission = createCommissionFixture();
    const vote = createVoteFixture([VotingChannel.Onsite]);
    const manager = createManagerFixture();
    const save = jest.fn<Promise<void>, [FieldVotingSessionAggregate]>()
      .mockResolvedValue(undefined);
    const handler = new CreateFieldVotingSessionHandler(
      {
        nextId: jest.fn().mockReturnValue('commission-unused'),
        findById: jest.fn().mockResolvedValue(commission),
        save: jest.fn(),
      },
      {
        nextId: jest.fn().mockReturnValue('vote-unused'),
        findById: jest.fn().mockResolvedValue(vote),
        save: jest.fn(),
      },
      {
        findByIds: jest.fn().mockResolvedValue([manager]),
        nextId: jest.fn().mockReturnValue('member-unused'),
        save: jest.fn(),
      },
      {
        nextId: jest.fn().mockReturnValue('session-1'),
        findById: jest.fn().mockResolvedValue(undefined),
        save,
      },
    );

    const result = await handler.execute(
      CreateFieldVotingSessionCommand.of({
        commissionId: 'commission-1',
        voteId: 'vote-1',
        channel: VotingChannel.Onsite,
        title: 'Lobby voting desk',
        locationName: 'Main Lobby',
        address: 'Seoul Office',
        managerIds: ['member-1'],
        startsAt: new Date('2026-08-20T00:00:00.000Z'),
        endsAt: new Date('2026-08-20T09:00:00.000Z'),
        scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'session-1',
      voteId: 'vote-1',
      status: FieldVotingSessionStatus.Scheduled,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBeInstanceOf(FieldVotingSessionAggregate);
  });
});
```

Define local fixture functions at the top of the test file using the aggregates from Tasks 1 to 3.

- [ ] **Step 3: Write failing status handler tests**

Create `server/test/application/command/change-field-voting-session-status.handler.spec.ts`:

```typescript
describe('field voting session status handlers', () => {
  it('opens a scheduled field voting session', async () => {
    const session = createScheduledSessionFixture();
    const save = jest.fn<Promise<void>, [FieldVotingSessionAggregate]>()
      .mockResolvedValue(undefined);
    const repository: FieldVotingSessionRepositoryPort = {
      nextId: jest.fn().mockReturnValue('unused'),
      findById: jest.fn().mockResolvedValue(session),
      save,
    };
    const handler = new OpenFieldVotingSessionHandler(repository);

    const result = await handler.execute(
      OpenFieldVotingSessionCommand.of({
        fieldVotingSessionId: 'session-1',
        openedAt: new Date('2026-08-20T00:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'session-1',
      status: FieldVotingSessionStatus.Open,
    });
    expect(save.mock.calls[0][0].status).toBe(FieldVotingSessionStatus.Open);
  });
});
```

Add separate tests in the same file for close and cancel using `CloseFieldVotingSessionHandler` and `CancelFieldVotingSessionHandler`.

- [ ] **Step 4: Run tests to verify expected failures**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand election-commission-command.handlers.spec.ts create-field-voting-session.handler.spec.ts change-field-voting-session-status.handler.spec.ts
```

Expected: FAIL with missing command, handler, and port modules.

- [ ] **Step 5: Implement ports**

Create `FieldVotingSessionRepositoryPort`:

```typescript
import type { FieldVotingSessionAggregate } from '../../domain/field-voting/field-voting-session.aggregate';

export const FIELD_VOTING_SESSION_REPOSITORY_PORT = Symbol(
  'FIELD_VOTING_SESSION_REPOSITORY_PORT',
);

export interface FieldVotingSessionRepositoryPort {
  nextId(): string;
  findById(
    fieldVotingSessionId: string,
  ): Promise<FieldVotingSessionAggregate | undefined>;
  save(fieldVotingSession: FieldVotingSessionAggregate): Promise<void>;
}
```

Create `ElectionCommissionMemberRepositoryPort` with `nextId`, `findByIds`, and `save`.

- [ ] **Step 6: Implement commands**

Use this shape for `CreateFieldVotingSessionCommand`:

```typescript
export class CreateFieldVotingSessionCommand {
  private constructor(
    readonly commissionId: string,
    readonly voteId: string,
    readonly channel: VotingChannel,
    readonly title: string,
    readonly locationName: string,
    readonly address: string,
    readonly managerIds: readonly string[],
    readonly startsAt: Date,
    readonly endsAt: Date,
    readonly scheduledAt: Date,
  ) {}

  static of(params: {
    commissionId: string;
    voteId: string;
    channel: VotingChannel;
    title: string;
    locationName: string;
    address: string;
    managerIds: readonly string[];
    startsAt: Date;
    endsAt: Date;
    scheduledAt: Date;
  }): CreateFieldVotingSessionCommand {
    return new CreateFieldVotingSessionCommand(
      params.commissionId,
      params.voteId,
      params.channel,
      params.title,
      params.locationName,
      params.address,
      params.managerIds,
      params.startsAt,
      params.endsAt,
      params.scheduledAt,
    );
  }
}
```

Use the same command pattern for open, close, and cancel with `fieldVotingSessionId` plus the transition timestamp.

- [ ] **Step 7: Implement handlers**

In `CreateElectionCommissionHandler`, create and save `ElectionCommissionAggregate`.

In `RegisterElectionCommissionMemberHandler`, load the commission, reject missing or suspended commissions, create the member, and save it.

In `CreateFieldVotingSessionHandler`, load commission, vote, and managers. Throw plain application errors:

```typescript
export class ElectionCommissionNotFoundError extends Error {
  constructor() {
    super('election commission not found');
  }
}

export class VoteNotFoundError extends Error {
  constructor() {
    super('vote not found');
  }
}

export class ElectionCommissionMemberNotFoundError extends Error {
  constructor() {
    super('election commission member not found');
  }
}
```

Create the session through `FieldVotingSessionAggregate.schedule()` and save it.

- [ ] **Step 8: Run focused tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand election-commission-command.handlers.spec.ts create-field-voting-session.handler.spec.ts change-field-voting-session-status.handler.spec.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add server/src/application server/test/application
git commit -m "feat(server): add field voting session commands"
```

---

### Task 5: Participation Channel And Cast Command

**Files:**
- Modify: `server/src/domain/participation/participation.aggregate.ts`
- Modify: `server/src/domain/participation/participation-eligibility.policy.ts`
- Create: `server/src/application/port/participation-repository.port.ts`
- Create: `server/src/application/command/cast-participation.command.ts`
- Create: `server/src/application/command/cast-participation.handler.ts`
- Modify: `server/src/application/port/vote-detail-repository.port.ts`
- Modify: `server/src/infrastructure/database/mapper/participation.mapper.ts`
- Modify: `server/test/domain/participation/participation-domain.spec.ts`
- Create: `server/test/application/command/cast-participation.handler.spec.ts`
- Modify: `server/test/infrastructure/database/mapper/database-mappers.spec.ts`

**Interfaces:**
- Updates: `ParticipationAggregate.cast({ id, voteDetailId, elector, selectedCandidateId?, effectivePolicy, votingChannel, fieldVotingSession?, participatedAt })`.
- Updates: `ParticipationAggregate.reconstitute({ ..., votingChannel, fieldVotingSessionId? })`.
- Produces: `ParticipationRepositoryPort.nextId()`, `findById(participationId)`, `findCastByVoteDetailId(voteDetailId)`, `save(participation)`.
- Produces: `CastParticipationCommand.of({ voteId, voteDetailId, electorId, selectedCandidateId?, votingChannel, fieldVotingSessionId?, participatedAt })`.
- Produces: `CastParticipationResult = { id: string; voteDetailId: string; status: ParticipationStatus }`.

- [ ] **Step 1: Write failing domain tests for channel rules**

Add to `server/test/domain/participation/participation-domain.spec.ts`:

```typescript
it('rejects onsite participation without an open field voting session', () => {
  expect(() =>
    ParticipationAggregate.cast({
      id: 'participation-field-1',
      voteDetailId: 'detail-1',
      elector: createElector(),
      effectivePolicy: secretEqualIndividualPolicy,
      votingChannel: VotingChannel.Onsite,
      participatedAt: new Date('2026-08-20T01:00:00.000Z'),
    }),
  ).toThrow(DomainError);
});

it('rejects online participation with a field voting session', () => {
  const session = createOpenFieldVotingSessionFixture();

  expect(() =>
    ParticipationAggregate.cast({
      id: 'participation-field-2',
      voteDetailId: 'detail-1',
      elector: createElector(),
      effectivePolicy: secretEqualIndividualPolicy,
      votingChannel: VotingChannel.Online,
      fieldVotingSession: session,
      participatedAt: new Date('2026-08-20T01:00:00.000Z'),
    }),
  ).toThrow(DomainError);
});

it('keeps secret onsite participation candidate id absent', () => {
  const participation = ParticipationAggregate.cast({
    id: 'participation-field-3',
    voteDetailId: 'detail-1',
    elector: createElector(),
    selectedCandidateId: createCandidate().id,
    effectivePolicy: secretEqualIndividualPolicy,
    votingChannel: VotingChannel.Onsite,
    fieldVotingSession: createOpenFieldVotingSessionFixture(),
    participatedAt: new Date('2026-08-20T01:00:00.000Z'),
  });

  expect(participation.votingChannel).toBe(VotingChannel.Onsite);
  expect(participation.fieldVotingSessionId).toBe('session-1');
  expect(participation.candidateId).toBeUndefined();
});
```

Add a duplicate prevention test that creates two existing participations with different `fieldVotingSessionId` values and verifies `ParticipationEligibilityPolicy` still rejects by `voteDetailId + electorId`.

- [ ] **Step 2: Write failing application handler test**

Create `server/test/application/command/cast-participation.handler.spec.ts`:

```typescript
describe('CastParticipationHandler', () => {
  it('casts onsite participation through an open field voting session', async () => {
    const save = jest.fn<Promise<void>, [ParticipationAggregate]>()
      .mockResolvedValue(undefined);
    const handler = new CastParticipationHandler(
      voteRepositoryFixture(),
      voteDetailRepositoryFixture(),
      electorRepositoryFixture(),
      {
        nextId: jest.fn().mockReturnValue('participation-1'),
        findById: jest.fn().mockResolvedValue(undefined),
        findCastByVoteDetailId: jest.fn().mockResolvedValue([]),
        save,
      },
      {
        nextId: jest.fn().mockReturnValue('session-unused'),
        findById: jest.fn().mockResolvedValue(createOpenFieldVotingSessionFixture()),
        save: jest.fn(),
      },
    );

    const result = await handler.execute(
      CastParticipationCommand.of({
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
        electorId: 'elector-1',
        votingChannel: VotingChannel.Onsite,
        fieldVotingSessionId: 'session-1',
        participatedAt: new Date('2026-08-20T01:00:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      status: ParticipationStatus.Cast,
    });
    expect(save.mock.calls[0][0]).toMatchObject({
      votingChannel: VotingChannel.Onsite,
      fieldVotingSessionId: 'session-1',
    });
  });
});
```

- [ ] **Step 3: Run tests to verify expected failures**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand participation-domain.spec.ts cast-participation.handler.spec.ts infrastructure/database/mapper/database-mappers.spec.ts
```

Expected: FAIL because participation has no voting channel fields or cast command.

- [ ] **Step 4: Update `ParticipationAggregate`**

Add constructor fields:

```typescript
readonly votingChannel: VotingChannel,
readonly fieldVotingSessionId: string | undefined,
```

Add cast validation:

```typescript
private static resolveFieldVotingSessionId(
  votingChannel: VotingChannel,
  fieldVotingSession: FieldVotingSessionAggregate | undefined,
): string | undefined {
  if (votingChannel === VotingChannel.Online) {
    if (fieldVotingSession) {
      throw new DomainError('online participation must not use field voting session');
    }

    return undefined;
  }

  if (!fieldVotingSession) {
    throw new DomainError('field participation requires field voting session');
  }

  if (fieldVotingSession.status !== FieldVotingSessionStatus.Open) {
    throw new DomainError('field voting session must be open');
  }

  if (fieldVotingSession.channel !== votingChannel) {
    throw new DomainError('field voting session channel mismatch');
  }

  return fieldVotingSession.id;
}
```

- [ ] **Step 5: Implement repository port, command, and handler**

Create `ParticipationRepositoryPort`:

```typescript
import type { ParticipationAggregate } from '../../domain/participation/participation.aggregate';

export const PARTICIPATION_REPOSITORY_PORT = Symbol(
  'PARTICIPATION_REPOSITORY_PORT',
);

export interface ParticipationRepositoryPort {
  nextId(): string;
  findById(
    participationId: string,
  ): Promise<ParticipationAggregate | undefined>;
  findCastByVoteDetailId(
    voteDetailId: string,
  ): Promise<ParticipationAggregate[]>;
  save(participation: ParticipationAggregate): Promise<void>;
}
```

In `CastParticipationHandler`, load vote, vote detail, elector, existing cast participations, and the optional field session. Verify `voteDetail.voteId === vote.id`. Verify field session `voteId === vote.id` when provided. Calculate effective policy from `voteDetail.getEffectivePolicy(vote.defaultPolicy)`. Call `ParticipationEligibilityPolicy.assertCanParticipate()` before `ParticipationAggregate.cast()`.

- [ ] **Step 6: Update mapper and mapper test**

Update `ParticipationPersistence`:

```typescript
readonly votingChannel: VotingChannel;
readonly fieldVotingSession: EntityRelationReference | null;
```

Map to domain:

```typescript
votingChannel: entity.votingChannel,
fieldVotingSessionId: entity.fieldVotingSession?.id,
```

Use `null` only in infrastructure persistence types and tests.

- [ ] **Step 7: Run focused tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand participation-domain.spec.ts cast-participation.handler.spec.ts infrastructure/database/mapper/database-mappers.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/src/domain/participation server/src/application server/src/infrastructure/database/mapper server/test
git commit -m "feat(server): add field-aware participation casting"
```

---

### Task 6: Field Participation Evidence Domain And Command

**Files:**
- Create: `server/test/domain/field-voting/field-participation-evidence-domain.spec.ts`
- Create: `server/test/application/command/record-field-participation-evidence.handler.spec.ts`
- Modify: `server/src/domain/field-voting/field-voting.events.ts`
- Create: `server/src/domain/field-voting/field-participation-evidence.aggregate.ts`
- Create: `server/src/application/port/field-participation-evidence-repository.port.ts`
- Create: `server/src/application/port/file-repository.port.ts`
- Create: `server/src/application/command/record-field-participation-evidence.command.ts`
- Create: `server/src/application/command/record-field-participation-evidence.handler.ts`
- Modify: `server/src/domain/index.ts`

**Interfaces:**
- Produces: `FieldParticipationEvidenceAggregate.record(params)`.
- Produces: `FieldParticipationEvidenceRepositoryPort.nextId()` and `save(evidence)`.
- Produces: `FileRepositoryPort.existsById(fileId: string): Promise<boolean>`.
- Produces: `RecordFieldParticipationEvidenceCommand.of({ participationId, fieldVotingSessionId, verifiedByCommissionMemberId, evidenceFileId?, verificationNote?, verifiedAt })`.

- [ ] **Step 1: Write failing evidence domain tests**

Create `server/test/domain/field-voting/field-participation-evidence-domain.spec.ts`:

```typescript
describe('field participation evidence domain', () => {
  it('records evidence for field participation verified by an assigned manager', () => {
    const session = createOpenFieldVotingSessionFixture();
    const participation = createFieldParticipationFixture(session);
    const manager = createManagerFixture();

    const evidence = FieldParticipationEvidenceAggregate.record({
      id: 'evidence-1',
      participation,
      fieldVotingSession: session,
      verifiedBy: manager,
      evidenceFileId: 'file-1',
      verificationNote: 'signature checked',
      verifiedAt: new Date('2026-08-20T01:10:00.000Z'),
    });

    expect(evidence).toMatchObject({
      id: 'evidence-1',
      participationId: 'participation-1',
      fieldVotingSessionId: 'session-1',
      verifiedByCommissionMemberId: 'member-1',
      evidenceFileId: 'file-1',
      verificationNote: 'signature checked',
    });
    expect(evidence.pullEvents()[0]).toBeInstanceOf(
      FieldParticipationEvidenceRecorded,
    );
  });

  it('rejects evidence for online participation', () => {
    expect(() =>
      FieldParticipationEvidenceAggregate.record({
        id: 'evidence-online',
        participation: createOnlineParticipationFixture(),
        fieldVotingSession: createOpenFieldVotingSessionFixture(),
        verifiedBy: createManagerFixture(),
        verifiedAt: new Date('2026-08-20T01:10:00.000Z'),
      }),
    ).toThrow(DomainError);
  });
});
```

- [ ] **Step 2: Write failing handler test**

Create `server/test/application/command/record-field-participation-evidence.handler.spec.ts`:

```typescript
describe('RecordFieldParticipationEvidenceHandler', () => {
  it('records field evidence without reading raw file or identity data', async () => {
    const save = jest.fn<Promise<void>, [FieldParticipationEvidenceAggregate]>()
      .mockResolvedValue(undefined);
    const handler = new RecordFieldParticipationEvidenceHandler(
      {
        nextId: jest.fn().mockReturnValue('participation-unused'),
        findById: jest.fn().mockResolvedValue(createFieldParticipationFixture()),
        findCastByVoteDetailId: jest.fn().mockResolvedValue([
          createFieldParticipationFixture(),
        ]),
        save: jest.fn(),
      },
      {
        nextId: jest.fn().mockReturnValue('session-unused'),
        findById: jest.fn().mockResolvedValue(createOpenFieldVotingSessionFixture()),
        save: jest.fn(),
      },
      {
        nextId: jest.fn().mockReturnValue('member-unused'),
        findByIds: jest.fn().mockResolvedValue([createManagerFixture()]),
        save: jest.fn(),
      },
      {
        existsById: jest.fn().mockResolvedValue(true),
      },
      {
        nextId: jest.fn().mockReturnValue('evidence-1'),
        save,
      },
    );

    const result = await handler.execute(
      RecordFieldParticipationEvidenceCommand.of({
        participationId: 'participation-1',
        fieldVotingSessionId: 'session-1',
        verifiedByCommissionMemberId: 'member-1',
        evidenceFileId: 'file-1',
        verificationNote: 'signature checked',
        verifiedAt: new Date('2026-08-20T01:10:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'evidence-1',
      participationId: 'participation-1',
    });
    expect(save.mock.calls[0][0]).toMatchObject({
      evidenceFileId: 'file-1',
      verificationNote: 'signature checked',
    });
  });
});
```

- [ ] **Step 3: Run tests to verify expected failures**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand field-participation-evidence-domain.spec.ts record-field-participation-evidence.handler.spec.ts
```

Expected: FAIL because evidence aggregate, command, handler, and ports do not exist.

- [ ] **Step 4: Implement evidence event and aggregate**

Add `FieldParticipationEvidenceRecorded` to `field-voting.events.ts`.

Implement aggregate constructor:

```typescript
private constructor(
  readonly id: string,
  readonly participationId: string,
  readonly fieldVotingSessionId: string,
  readonly verifiedByCommissionMemberId: string,
  readonly evidenceFileId: string | undefined,
  readonly verificationNote: string | undefined,
  readonly verifiedAt: Date,
) {}
```

Validation rules:

```typescript
if (participation.votingChannel === VotingChannel.Online) {
  throw new DomainError('field evidence requires field participation');
}

if (participation.fieldVotingSessionId !== fieldVotingSession.id) {
  throw new DomainError('field evidence session mismatch');
}

if (!fieldVotingSession.hasAssignedManager(verifiedBy.id)) {
  throw new DomainError('field evidence verifier must be assigned manager');
}
```

- [ ] **Step 5: Implement ports, command, and handler**

Create `FileRepositoryPort`:

```typescript
export const FILE_REPOSITORY_PORT = Symbol('FILE_REPOSITORY_PORT');

export interface FileRepositoryPort {
  existsById(fileId: string): Promise<boolean>;
}
```

In the handler, load participation with `ParticipationRepositoryPort.findById(command.participationId)`. Load session by id, manager by id using `findByIds(session.commissionId, [memberId])`, check file existence when `evidenceFileId` is present, then save the evidence aggregate.

- [ ] **Step 6: Run focused tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand field-participation-evidence-domain.spec.ts record-field-participation-evidence.handler.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/domain/field-voting server/src/application server/test
git commit -m "feat(server): add field participation evidence"
```

---

### Task 7: Presentation Controllers And DTOs

**Files:**
- Create: `server/test/presentation/route/election-commission/election-commission.controller.spec.ts`
- Create: `server/test/presentation/route/field-voting-session/field-voting-session.controller.spec.ts`
- Create: `server/test/presentation/route/participation/participation.controller.spec.ts`
- Create: `server/src/presentation/route/election-commission/election-commission.controller.ts`
- Create: `server/src/presentation/route/election-commission/dto/create-election-commission-request.dto.ts`
- Create: `server/src/presentation/route/election-commission/dto/create-election-commission-response.dto.ts`
- Create: `server/src/presentation/route/election-commission/dto/register-election-commission-member-request.dto.ts`
- Create: `server/src/presentation/route/election-commission/dto/register-election-commission-member-response.dto.ts`
- Create: `server/src/presentation/route/field-voting-session/field-voting-session.controller.ts`
- Create: `server/src/presentation/route/field-voting-session/dto/create-field-voting-session-request.dto.ts`
- Create: `server/src/presentation/route/field-voting-session/dto/create-field-voting-session-response.dto.ts`
- Create: `server/src/presentation/route/field-voting-session/dto/change-field-voting-session-status-request.dto.ts`
- Create: `server/src/presentation/route/field-voting-session/dto/change-field-voting-session-status-response.dto.ts`
- Create: `server/src/presentation/route/participation/dto/cast-participation-request.dto.ts`
- Create: `server/src/presentation/route/participation/dto/cast-participation-response.dto.ts`
- Create: `server/src/presentation/route/participation/dto/record-field-participation-evidence-request.dto.ts`
- Create: `server/src/presentation/route/participation/dto/record-field-participation-evidence-response.dto.ts`
- Modify: `server/src/presentation/route/participation/participation.controller.ts`

**Interfaces:**
- Produces: `ElectionCommissionController`.
- Produces: `FieldVotingSessionController`.
- Updates: `ParticipationController.castParticipation()` and `recordFieldParticipationEvidence()`.
- Request DTOs define transport-local literal string types and Swagger decorators.
- Response DTOs use private constructor plus `static of()`.

- [ ] **Step 1: Write failing controller tests**

Create `server/test/presentation/route/election-commission/election-commission.controller.spec.ts` with tests that instantiate the controller and verify:

```typescript
expect(createElectionCommissionExecute.mock.calls[0][0]).toMatchObject({
  name: 'Main Commission',
});
expect(registerMemberExecute.mock.calls[0][0]).toMatchObject({
  commissionId: 'commission-1',
  name: 'Kim Manager',
  role: 'FIELD_MANAGER',
});
```

Create `server/test/presentation/route/field-voting-session/field-voting-session.controller.spec.ts` with tests that verify `create`, `open`, `close`, and `cancel` route methods call their handlers with route params and body fields.

Create `server/test/presentation/route/participation/participation.controller.spec.ts` with tests that verify:

```typescript
expect(castParticipationExecute.mock.calls[0][0]).toMatchObject({
  voteId: 'vote-1',
  voteDetailId: 'detail-1',
  electorId: 'elector-1',
  votingChannel: 'ONSITE',
  fieldVotingSessionId: 'session-1',
});
expect(recordEvidenceExecute.mock.calls[0][0]).toMatchObject({
  participationId: 'participation-1',
  fieldVotingSessionId: 'session-1',
  verifiedByCommissionMemberId: 'member-1',
  evidenceFileId: 'file-1',
});
```

- [ ] **Step 2: Run tests to verify expected failures**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand presentation/route/election-commission/election-commission.controller.spec.ts presentation/route/field-voting-session/field-voting-session.controller.spec.ts presentation/route/participation/participation.controller.spec.ts
```

Expected: FAIL because controllers and DTOs do not exist or methods are missing.

- [ ] **Step 3: Implement election commission controller and DTOs**

Use routes:

```typescript
@ApiTags('election-commissions')
@Controller('election-commissions')
export class ElectionCommissionController {
  constructor(
    private readonly createElectionCommissionHandler: CreateElectionCommissionHandler,
    private readonly registerElectionCommissionMemberHandler: RegisterElectionCommissionMemberHandler,
  ) {}
}
```

Add `@Post()` for commission creation and `@Post(':commissionId/members')` for member registration. Map DTOs to commands only.

- [ ] **Step 4: Implement field voting session controller and DTOs**

Use routes:

```typescript
@ApiTags('field-voting-sessions')
@Controller()
export class FieldVotingSessionController {
  @Post('votes/:voteId/field-voting-sessions')
  async createFieldVotingSession(...) {}

  @Post('field-voting-sessions/:fieldVotingSessionId/open')
  async openFieldVotingSession(...) {}
}
```

Add close and cancel methods with the same route shape. Convert ISO string dates to `new Date(value)` at the controller boundary.

- [ ] **Step 5: Implement participation controller methods and DTOs**

Use `@Controller('participations')`. Add:

```typescript
@Post()
async castParticipation(@Body() body: CastParticipationBody): Promise<CastParticipationResponse>

@Post(':participationId/field-evidence')
async recordFieldParticipationEvidence(
  @Param() params: RecordFieldParticipationEvidenceParam,
  @Body() body: RecordFieldParticipationEvidenceBody,
): Promise<RecordFieldParticipationEvidenceResponse>
```

The controller must not check secrecy, duplicate voting, channel allowance, or session status.

- [ ] **Step 6: Run controller tests and layer boundary test**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand presentation/route/election-commission/election-commission.controller.spec.ts presentation/route/field-voting-session/field-voting-session.controller.spec.ts presentation/route/participation/participation.controller.spec.ts architecture/layer-boundary.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/presentation server/test/presentation server/test/architecture
git commit -m "feat(server): add field voting API boundaries"
```

---

### Task 8: Persistence Entities, Mappers, Migration, And ERD

**Files:**
- Modify: `server/src/infrastructure/database/entity/type/database-enum.type.ts`
- Modify: `server/src/infrastructure/database/entity/index.ts`
- Create: `server/src/infrastructure/database/mapper/election-commission.mapper.ts`
- Create: `server/src/infrastructure/database/mapper/election-commission-member.mapper.ts`
- Create: `server/src/infrastructure/database/mapper/field-voting-session.mapper.ts`
- Create: `server/src/infrastructure/database/mapper/field-participation-evidence.mapper.ts`
- Modify: `server/src/infrastructure/database/mapper/vote.mapper.ts`
- Modify: `server/src/infrastructure/database/mapper/participation.mapper.ts`
- Create: `server/src/infrastructure/database/migration/Migration20260813000000.ts`
- Modify: `server/test/infrastructure/database/entity/database-entities.spec.ts`
- Modify: `server/test/infrastructure/database/mapper/database-mappers.spec.ts`
- Create: `server/test/infrastructure/database/migration/election-commission-field-voting-migration.spec.ts`
- Modify: `ERD.md`

**Interfaces:**
- Adds entity classes: `ElectionCommissionEntity`, `ElectionCommissionMemberEntity`, `VoteVotingChannelEntity`, `FieldVotingSessionEntity`, `FieldVotingSessionManagerEntity`, `FieldParticipationEvidenceEntity`.
- Updates: `VoteMapper.toDomain()` consumes `commission` and `votingChannels`.
- Updates: `ParticipationMapper.toDomain()` consumes `votingChannel` and nullable `fieldVotingSession`.
- Produces mappers for the four new aggregate types.
- Produces migration `Migration20260813000000`.

- [ ] **Step 1: Write failing entity registry test update**

Update expected entity names in `server/test/infrastructure/database/entity/database-entities.spec.ts`:

```typescript
expect(databaseEntities.map((entity) => entity.name).sort()).toEqual([
  'CandidateAttachmentEntity',
  'CandidateEntity',
  'ElectionCommissionEntity',
  'ElectionCommissionMemberEntity',
  'ElectorAttachmentEntity',
  'ElectorEntity',
  'ElectorIdentityVerificationEntity',
  'FieldParticipationEvidenceEntity',
  'FieldVotingSessionEntity',
  'FieldVotingSessionManagerEntity',
  'FileEntity',
  'VoteAttachmentEntity',
  'VoteContentChangeHistoryEntity',
  'VoteDetailEntity',
  'VoteEntity',
  'VoteParticipationEntity',
  'VoteResultEntity',
  'VoteResultStorageRecordEntity',
  'VoteVotingChannelEntity',
]);
```

- [ ] **Step 2: Write failing mapper tests**

Add tests to `server/test/infrastructure/database/mapper/database-mappers.spec.ts` that call:

```typescript
ElectionCommissionMapper.toDomain({
  id: 'commission-1',
  name: 'Main Commission',
  status: 'ACTIVE',
  createdAt: new Date('2026-08-13T00:00:00.000Z'),
});

FieldVotingSessionMapper.toDomain({
  id: 'session-1',
  commission: { id: 'commission-1' },
  vote: { id: 'vote-1' },
  channel: VotingChannel.Onsite,
  title: 'Lobby voting desk',
  locationName: 'Main Lobby',
  address: 'Seoul Office',
  managerLinks: [{ commissionMember: { id: 'member-1' } }],
  startsAt: new Date('2026-08-20T00:00:00.000Z'),
  endsAt: new Date('2026-08-20T09:00:00.000Z'),
  status: FieldVotingSessionStatus.Open,
});
```

Update existing vote mapper fixtures to include:

```typescript
commission: { id: 'commission-1' },
votingChannels: [{ channel: VotingChannel.Online }],
```

Update participation mapper fixtures to include:

```typescript
votingChannel: VotingChannel.Onsite,
fieldVotingSession: { id: 'session-1' },
```

- [ ] **Step 3: Write failing migration test**

Create `server/test/infrastructure/database/migration/election-commission-field-voting-migration.spec.ts`:

```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('election commission field voting migration', () => {
  const migrationSource = readFileSync(
    join(
      process.cwd(),
      'src/infrastructure/database/migration/Migration20260813000000.ts',
    ),
    'utf8',
  );

  it('creates field voting tables and alters existing vote tables', () => {
    for (const tableName of [
      'election_commissions',
      'election_commission_members',
      'vote_voting_channels',
      'field_voting_sessions',
      'field_voting_session_managers',
      'field_participation_evidences',
    ]) {
      expect(migrationSource).toContain(`create table "${tableName}"`);
    }

    expect(migrationSource).toContain(
      'alter table "votes" add column "commission_id"',
    );
    expect(migrationSource).toContain(
      'alter table "vote_participations" add column "voting_channel"',
    );
    expect(migrationSource).toContain(
      'alter table "vote_participations" add column "field_voting_session_id"',
    );
  });

  it('declares field voting channel constraints', () => {
    expect(migrationSource).toContain(
      "field_voting_sessions_channel_check",
    );
    expect(migrationSource).toContain("'ONSITE', 'VISIT'");
    expect(migrationSource).toContain(
      "vote_participations_field_session_channel_check",
    );
    expect(migrationSource).toContain(
      "voting_channel = 'ONLINE' and field_voting_session_id is null",
    );
  });
});
```

- [ ] **Step 4: Run tests to verify expected failures**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand infrastructure/database/entity/database-entities.spec.ts infrastructure/database/mapper/database-mappers.spec.ts infrastructure/database/migration/election-commission-field-voting-migration.spec.ts
```

Expected: FAIL because entities, mappers, and migration do not exist.

- [ ] **Step 5: Update database enum type exports**

Add string union exports:

```typescript
export type VotingChannel = 'ONLINE' | 'ONSITE' | 'VISIT';
export type ElectionCommissionStatus = 'ACTIVE' | 'SUSPENDED';
export type ElectionCommissionMemberRole = 'ADMIN' | 'FIELD_MANAGER';
export type ElectionCommissionMemberStatus = 'ACTIVE' | 'INACTIVE';
export type FieldVotingSessionStatus =
  'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELED';
```

- [ ] **Step 6: Add entity schemas**

In `server/src/infrastructure/database/entity/index.ts`, add schema classes for the six new tables. Add relations from `VoteEntity` to `ElectionCommissionEntity` through `commission`, from `VoteEntity` to `VoteVotingChannelEntity`, and from `VoteParticipationEntity` to `FieldVotingSessionEntity`.

Keep entity classes empty:

```typescript
class ElectionCommissionEntity extends ElectionCommissionSchema.class {}
ElectionCommissionSchema.setClass(ElectionCommissionEntity);
```

- [ ] **Step 7: Implement mappers**

Use explicit mapper types. Example:

```typescript
export type FieldVotingSessionPersistence = {
  readonly id: string;
  readonly commission: EntityRelationReference;
  readonly vote: EntityRelationReference;
  readonly channel: VotingChannel;
  readonly title: string;
  readonly locationName: string;
  readonly address: string;
  readonly managerLinks: readonly {
    readonly commissionMember: EntityRelationReference;
  }[];
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: FieldVotingSessionStatus;
};
```

Use `FieldVotingSessionAggregate.reconstitute()` in the mapper so no events are emitted.

- [ ] **Step 8: Implement migration**

Create `Migration20260813000000` extending MikroORM `Migration`. In `up()`, create the six new tables, add `votes.commission_id`, add `vote_participations.voting_channel`, add `vote_participations.field_voting_session_id`, create foreign keys, add indexes, and add check constraints. In `down()`, drop constraints, columns, and new tables in reverse dependency order.

Use these constraint names:

```text
vote_voting_channels_channel_check
field_voting_sessions_channel_check
field_voting_sessions_time_range_check
vote_participations_voting_channel_check
vote_participations_field_session_channel_check
```

- [ ] **Step 9: Update `ERD.md`**

Add the six new tables to the Mermaid diagram and table notes. Add `commission_id` to `VOTES`, `VOTE_VOTING_CHANNELS`, and field session columns on `VOTE_PARTICIPATIONS`. Add a note that duplicate participation remains scoped to vote detail plus elector or group key, not field session.

- [ ] **Step 10: Run focused tests**

Run:

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand infrastructure/database/entity/database-entities.spec.ts infrastructure/database/entity/entity-domain-isolation.spec.ts infrastructure/database/mapper/database-mappers.spec.ts infrastructure/database/migration/election-commission-field-voting-migration.spec.ts architecture/layer-boundary.spec.ts
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add ERD.md server/src/infrastructure/database server/test/infrastructure server/test/architecture
git commit -m "feat(server): add field voting persistence schema"
```

---

### Task 9: Full Verification

**Files:**
- Read: all files changed in Tasks 1 through 8.

**Interfaces:**
- Consumes: all domain, application, presentation, and infrastructure contracts added by this plan.
- Produces: verified branch state on Node 24.

- [ ] **Step 1: Run full unit suite**

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test -- --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run e2e suite**

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server test:e2e -- --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run build**

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server build
```

Expected: PASS.

- [ ] **Step 4: Run lint**

```bash
source ~/.nvm/nvm.sh && nvm use 24 && pnpm --filter @vote/server lint
```

Expected: PASS.

- [ ] **Step 5: Inspect final diff**

```bash
git status --short
git diff --stat HEAD~8..HEAD
```

Expected: working tree clean and commits present for each completed task.
