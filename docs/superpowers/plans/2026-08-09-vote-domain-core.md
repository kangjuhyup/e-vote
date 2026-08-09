# Vote Domain Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first pure TypeScript electronic voting domain core under `server/src/domain`.

**Architecture:** Domain code is framework-free and contains only aggregates, value objects, domain events, and domain errors. NestJS, persistence, repositories, file storage, identity provider adapters, blockchain adapters, and HTTP concerns remain outside this phase.

**Tech Stack:** TypeScript, Jest, NestJS project shell, pnpm workspace.

## Global Constraints

- Domain files must not import NestJS, ORM, cache, storage, blockchain, or HTTP modules.
- Use `elector`, not deprecated eligible-user terms, for the elector registry concept.
- Secret participation must not persist a selected candidate id.
- Public participation must require a selected candidate id.
- Vote detail policy overrides must fall back to parent vote defaults.
- Tests must be written and watched failing before implementation.
- Run tests with `pnpm --filter @vote/server test -- <spec-file> --runInBand`.

---

### Task 1: Shared Domain Primitives

**Files:**
- Create: `server/src/domain/shared/domain-error.ts`
- Create: `server/src/domain/shared/domain-event.ts`
- Create: `server/src/domain/shared/id.ts`
- Test: `server/src/domain/shared/domain-primitives.spec.ts`

**Interfaces:**
- Produces: `DomainError extends Error`
- Produces: `DomainEvent` interface with `readonly type: string`, `readonly aggregateId: string`, `readonly occurredAt: Date`
- Produces: `createId(value: string): string`
- Produces: `assertPositiveNumber(value: number, fieldName: string): void`

- [ ] **Step 1: Write the failing test**

```typescript
import { DomainError } from './domain-error';
import { assertPositiveNumber, createId } from './id';

describe('shared domain primitives', () => {
  it('rejects empty ids', () => {
    expect(() => createId('')).toThrow(DomainError);
  });

  it('rejects non-positive numeric values', () => {
    expect(() => assertPositiveNumber(0, 'voteWeight')).toThrow(DomainError);
  });

  it('accepts valid ids and positive numeric values', () => {
    expect(createId('vote-1')).toBe('vote-1');
    expect(() => assertPositiveNumber(1.25, 'voteWeight')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @vote/server test -- domain/shared/domain-primitives.spec.ts --runInBand`

Expected: FAIL because `domain-error` and `id` modules do not exist.

- [ ] **Step 3: Write minimal implementation**

Create `DomainError`, `DomainEvent`, `createId`, and `assertPositiveNumber`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @vote/server test -- domain/shared/domain-primitives.spec.ts --runInBand`

Expected: PASS.

---

### Task 2: Vote, Vote Detail, Elector, and Candidate Aggregates

**Files:**
- Create: `server/src/domain/vote/vo/vote-policy.vo.ts`
- Create: `server/src/domain/vote/vo/identity-verification-policy.vo.ts`
- Create: `server/src/domain/vote/type/vote-policy.type.ts`
- Create: `server/src/domain/vote/type/vote-status.type.ts`
- Create: `server/src/domain/vote/type/vote-detail.type.ts`
- Create: `server/src/domain/elector/type/elector-status.type.ts`
- Create: `server/src/domain/candidate/type/candidate-status.type.ts`
- Create: `server/src/domain/vote/vote.events.ts`
- Create: `server/src/domain/vote/vote.aggregate.ts`
- Create: `server/src/domain/vote/vote-detail.aggregate.ts`
- Create: `server/src/domain/elector/elector.aggregate.ts`
- Create: `server/src/domain/candidate/candidate.aggregate.ts`
- Test: `server/src/domain/vote/vote-domain.spec.ts`

**Interfaces:**
- Consumes: `DomainError`, `DomainEvent`, `createId`, `assertPositiveNumber`
- Produces: policy const objects and union types `PrivacyMode`, `ParticipationUnit`, `ResultStorageMode`, `VoteWeightMode`
- Produces: status const objects and union types `VoteStatus`, `VoteDetailStatus`, `ElectorStatus`, `CandidateStatus`
- Produces: `VoteAggregate.create(params)`, `open(openedAt)`, `close(closedAt)`, `cancel(canceledAt)`, `pullEvents()`
- Produces: `VoteDetailAggregate.create(params)`, `getEffectivePolicy(parentPolicy)`
- Produces: `ElectorAggregate.create(params)`, `markIdentityVerified()`, `isIdentityVerified()`
- Produces: `CandidateAggregate.create(params)`, `withdraw()`

- [ ] **Step 1: Write the failing test**

```typescript
import { DomainError } from '../shared/domain-error';
import { ElectorAggregate } from '../elector/elector.aggregate';
import { CandidateAggregate } from '../candidate/candidate.aggregate';
import { VoteAggregate } from './vote.aggregate';
import { VoteDetailAggregate } from './vote-detail.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
} from './type/vote-policy.type';
import {
  VoteDetailStatus,
  VoteStatus,
  VoteWeightMode,
} from './type/vote-status.type';
import { ElectorStatus } from '../elector/type/elector-status.type';
import { CandidateStatus } from '../candidate/type/candidate-status.type';

describe('vote domain aggregates', () => {
  it('calculates effective vote detail policy from parent defaults and overrides', () => {
    const vote = VoteAggregate.create({
      id: 'vote-1',
      title: 'Board election',
      defaultPolicy: VotePolicy.of({
        privacyMode: PrivacyMode.Secret,
        participationUnit: ParticipationUnit.Individual,
        resultStorageMode: ResultStorageMode.Database,
        voteWeightMode: VoteWeightMode.Equal,
      }),
      identityVerificationPolicy: IdentityVerificationPolicy.of({ required: false }),
      status: VoteStatus.Draft,
    });
    const detail = VoteDetailAggregate.create({
      id: 'detail-1',
      voteId: vote.id,
      title: 'President',
      type: 'CANDIDATE',
      overrides: {
        privacyMode: PrivacyMode.Public,
        participationUnit: ParticipationUnit.Group,
        voteWeightMode: VoteWeightMode.Share,
      },
      sortOrder: 1,
      status: VoteDetailStatus.Draft,
    });

    expect(detail.getEffectivePolicy(vote.defaultPolicy)).toEqual({
      privacyMode: PrivacyMode.Public,
      participationUnit: ParticipationUnit.Group,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Share,
    });
  });

  it('validates identity verification policy consistency', () => {
    expect(() =>
      VoteAggregate.create({
        id: 'vote-2',
        title: 'Invalid',
        defaultPolicy: {
          privacyMode: PrivacyMode.Secret,
          participationUnit: ParticipationUnit.Individual,
          resultStorageMode: ResultStorageMode.Database,
          voteWeightMode: VoteWeightMode.Equal,
        },
        identityVerificationPolicy: { required: true },
        status: VoteStatus.Draft,
      }),
    ).toThrow(DomainError);
  });

  it('emits vote lifecycle events for valid status transitions', () => {
    const vote = VoteAggregate.create({
      id: 'vote-3',
      title: 'Lifecycle',
      defaultPolicy: {
        privacyMode: PrivacyMode.Secret,
        participationUnit: ParticipationUnit.Individual,
        resultStorageMode: ResultStorageMode.Database,
        voteWeightMode: VoteWeightMode.Equal,
      },
      identityVerificationPolicy: { required: false },
      status: VoteStatus.Draft,
    });

    vote.open(new Date('2026-08-09T00:00:00.000Z'));
    vote.close(new Date('2026-08-10T00:00:00.000Z'));

    expect(vote.status).toBe(VoteStatus.Closed);
    expect(vote.pullEvents().map((event) => event.type)).toEqual(['VoteOpened', 'VoteClosed']);
  });

  it('creates elector and candidate aggregates with validated values', () => {
    const elector = ElectorAggregate.create({
      id: 'elector-1',
      voteId: 'vote-1',
      identifier: 'member-1',
      groupKey: 'household-1',
      voteWeight: 2.5,
      status: ElectorStatus.Eligible,
    });
    const candidate = CandidateAggregate.create({
      id: 'candidate-1',
      voteDetailId: 'detail-1',
      candidateNo: 1,
      name: 'Kim',
      status: CandidateStatus.Active,
    });

    expect(elector.voteWeight).toBe(2.5);
    expect(candidate.status).toBe(CandidateStatus.Active);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @vote/server test -- domain/vote/vote-domain.spec.ts --runInBand`

Expected: FAIL because aggregate and policy modules do not exist.

- [ ] **Step 3: Write minimal implementation**

Implement policy constants, aggregate factories, validation, lifecycle transitions, and event buffering.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @vote/server test -- domain/vote/vote-domain.spec.ts --runInBand`

Expected: PASS.

---

### Task 3: Participation Aggregate and Eligibility Policy

**Files:**
- Create: `server/src/domain/participation/participation.aggregate.ts`
- Create: `server/src/domain/participation/participation-eligibility.policy.ts`
- Create: `server/src/domain/participation/type/participation-status.type.ts`
- Test: `server/src/domain/participation/participation-domain.spec.ts`

**Interfaces:**
- Consumes: policy constants and aggregates from Task 2
- Produces: const object and union type `ParticipationStatus`
- Produces: `ParticipationAggregate.cast(params)`
- Produces: `ParticipationAggregate.cancel(canceledAt)`
- Produces: `ParticipationEligibilityPolicy.assertCanParticipate(params)`

- [ ] **Step 1: Write the failing test**

```typescript
import { CandidateAggregate } from '../candidate/candidate.aggregate';
import { ElectorAggregate } from '../elector/elector.aggregate';
import { DomainError } from '../shared/domain-error';
import {
  CandidateStatus,
  ElectorStatus,
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../vote/vo/vote-policy.vo';
import { ParticipationStatus } from './type/participation-status.type';
import { ParticipationAggregate } from './participation.aggregate';
import { ParticipationEligibilityPolicy } from './participation-eligibility.policy';

describe('participation domain', () => {
  const publicShareGroupPolicy = VotePolicy.of({
    privacyMode: PrivacyMode.Public,
    participationUnit: ParticipationUnit.Group,
    resultStorageMode: ResultStorageMode.Database,
    voteWeightMode: VoteWeightMode.Share,
  });
  const secretEqualIndividualPolicy = {
    privacyMode: PrivacyMode.Secret,
    participationUnit: ParticipationUnit.Individual,
    resultStorageMode: ResultStorageMode.Database,
    voteWeightMode: VoteWeightMode.Equal,
  };

  const elector = ElectorAggregate.create({
    id: 'elector-1',
    voteId: 'vote-1',
    identifier: 'member-1',
    groupKey: 'household-1',
    voteWeight: 3.5,
    status: ElectorStatus.Eligible,
  });
  const candidate = CandidateAggregate.create({
    id: 'candidate-1',
    voteDetailId: 'detail-1',
    candidateNo: 1,
    name: 'Kim',
    status: CandidateStatus.Active,
  });

  it('does not persist selected candidate id for secret participation', () => {
    const participation = ParticipationAggregate.cast({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      elector,
      selectedCandidateId: candidate.id,
      effectivePolicy: secretEqualIndividualPolicy,
      participatedAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    expect(participation.candidateId).toBeNull();
    expect(participation.voteWeight).toBe(1);
  });

  it('requires selected candidate id for public participation', () => {
    expect(() =>
      ParticipationAggregate.cast({
        id: 'participation-2',
        voteDetailId: 'detail-1',
        elector,
        selectedCandidateId: null,
        effectivePolicy: publicShareGroupPolicy,
        participatedAt: new Date('2026-08-09T00:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('uses elector vote weight for share voting', () => {
    const participation = ParticipationAggregate.cast({
      id: 'participation-3',
      voteDetailId: 'detail-1',
      elector,
      selectedCandidateId: candidate.id,
      effectivePolicy: publicShareGroupPolicy,
      participatedAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    expect(participation.groupKey).toBe('household-1');
    expect(participation.voteWeight).toBe(3.5);
  });

  it('detects duplicate individual and group participation', () => {
    const policy = new ParticipationEligibilityPolicy();
    const existing = [
      ParticipationAggregate.cast({
        id: 'participation-4',
        voteDetailId: 'detail-1',
        elector,
        selectedCandidateId: null,
        effectivePolicy: secretEqualIndividualPolicy,
        participatedAt: new Date('2026-08-09T00:00:00.000Z'),
      }),
    ];

    expect(() =>
      policy.assertCanParticipate({
        voteDetailId: 'detail-1',
        elector,
        effectivePolicy: secretEqualIndividualPolicy,
        existingParticipations: existing,
      }),
    ).toThrow(DomainError);

    expect(() =>
      policy.assertCanParticipate({
        voteDetailId: 'detail-1',
        elector,
        effectivePolicy: publicShareGroupPolicy,
        existingParticipations: [
          ParticipationAggregate.cast({
            id: 'participation-5',
            voteDetailId: 'detail-1',
            elector,
            selectedCandidateId: candidate.id,
            effectivePolicy: publicShareGroupPolicy,
            participatedAt: new Date('2026-08-09T00:00:00.000Z'),
          }),
        ],
      }),
    ).toThrow(DomainError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @vote/server test -- domain/participation/participation-domain.spec.ts --runInBand`

Expected: FAIL because participation modules do not exist.

- [ ] **Step 3: Write minimal implementation**

Implement participation cast/cancel behavior, secrecy handling, vote weight calculation, and duplicate checks.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @vote/server test -- domain/participation/participation-domain.spec.ts --runInBand`

Expected: PASS.

---

### Task 4: Domain Barrel and Full Verification

**Files:**
- Create: `server/src/domain/index.ts`
- Modify: none outside `server/src/domain`

**Interfaces:**
- Consumes: all domain modules from Tasks 1-3
- Produces: public exports for aggregates, policies, errors, and events

- [ ] **Step 1: Create domain barrel exports**

```typescript
export * from './shared/domain-error';
export * from './shared/domain-event';
export * from './shared/id';
export * from './vote/vo/vote-policy.vo';
export * from './vote/vo/identity-verification-policy.vo';
export * from './vote/type/vote-policy.type';
export * from './vote/type/vote-status.type';
export * from './vote/type/vote-detail.type';
export * from './vote/vote.events';
export * from './vote/vote.aggregate';
export * from './vote/vote-detail.aggregate';
export * from './elector/elector.aggregate';
export * from './elector/type/elector-status.type';
export * from './candidate/candidate.aggregate';
export * from './candidate/type/candidate-status.type';
export * from './participation/participation.aggregate';
export * from './participation/participation-eligibility.policy';
export * from './participation/type/participation-status.type';
```

- [ ] **Step 2: Run full server domain tests**

Run: `pnpm --filter @vote/server test -- domain --runInBand`

Expected: PASS.

- [ ] **Step 3: Run full server tests**

Run: `pnpm --filter @vote/server test -- --runInBand`

Expected: PASS.

- [ ] **Step 4: Run build**

Run: `pnpm --filter @vote/server build`

Expected: PASS.

- [ ] **Step 5: Review imports**

Run: `rg -n "@nestjs|typeorm|prisma|sequelize|redis|blockchain|express|fastify" server/src/domain || true`

Expected: no output.
