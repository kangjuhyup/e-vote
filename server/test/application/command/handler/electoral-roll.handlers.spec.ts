import { AddElectoralRollMembersCommand } from '../../../../src/modules/electoral-roll/application/command/dto/request/add-electoral-roll-members.command';
import { CreateElectoralRollCommand } from '../../../../src/modules/electoral-roll/application/command/dto/request/create-electoral-roll.command';
import { AttachElectoralRollSnapshotCommand } from '../../../../src/modules/vote/application/command/dto/request/attach-electoral-roll-snapshot.command';
import { RemoveElectoralRollMemberCommand } from '../../../../src/modules/electoral-roll/application/command/dto/request/remove-electoral-roll-member.command';
import { UpdateElectoralRollMemberCommand } from '../../../../src/modules/electoral-roll/application/command/dto/request/update-electoral-roll-member.command';
import { ElectoralRollSnapshotCreator } from '../../../../src/modules/electoral-roll/application/command/electoral-roll-snapshot.creator';
import { ElectoralRollSnapshotResolver } from '../../../../src/modules/electoral-roll/application/command/electoral-roll-snapshot.resolver';
import { AddElectoralRollMembersHandler } from '../../../../src/modules/electoral-roll/application/command/handler/add-electoral-roll-members.handler';
import { CreateElectoralRollHandler } from '../../../../src/modules/electoral-roll/application/command/handler/create-electoral-roll.handler';
import { AttachElectoralRollSnapshotHandler } from '../../../../src/modules/vote/application/command/handler/attach-electoral-roll-snapshot.handler';
import { RemoveElectoralRollMemberHandler } from '../../../../src/modules/electoral-roll/application/command/handler/remove-electoral-roll-member.handler';
import { UpdateElectoralRollMemberHandler } from '../../../../src/modules/electoral-roll/application/command/handler/update-electoral-roll-member.handler';
import type { ElectoralRollRepositoryPort } from '../../../../src/modules/electoral-roll/application/port/persistence/command/electoral-roll-repository.port';
import type { ElectoralRollSnapshotRepositoryPort } from '../../../../src/modules/electoral-roll/application/port/persistence/command/electoral-roll-snapshot-repository.port';
import type { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';
import { ElectoralRollAggregate } from '../../../../src/modules/electoral-roll/domain/electoral-roll.aggregate';
import { ElectoralRollMemberAggregate } from '../../../../src/modules/electoral-roll/domain/electoral-roll-member.aggregate';
import {
  ElectoralRollSnapshotAggregate,
  ElectoralRollSnapshotMember,
} from '../../../../src/modules/electoral-roll/domain/electoral-roll-snapshot.aggregate';
import { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../src/shared/domain/voting/vo/vote-policy.vo';
import type { VoteSetupLifecyclePort } from '../../../../src/shared/application/port/capability/vote-billing.port';
import type { ElectoralRollSnapshotAccessPort } from '../../../../src/shared/application/port/capability/electoral-roll-snapshot-access.port';
import type { IdentityDataProtectorPort } from '../../../../src/shared/application/port/security/identity-data-protector.port';

describe('electoral roll command handlers', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');

  it('creates a commission-independent roll owned by its creator', async () => {
    const rollRepository = createRollRepository(createRoll(), []);
    const snapshotRepository = createSnapshotRepository();

    const result = await new CreateElectoralRollHandler(
      rollRepository,
      new ElectoralRollSnapshotCreator(rollRepository, snapshotRepository),
      immediateTransactionManager(),
    ).execute(
      CreateElectoralRollCommand.of({
        userPrincipalId: 'user-1',
        name: 'Independent members',
        createdAt: now,
      }),
    );

    expect(result).toEqual({
      id: 'roll-2',
      name: 'Independent members',
      revision: 1,
    });
    expect(rollRepository.create.mock.calls).toContainEqual([
      expect.objectContaining({
        id: 'roll-2',
        name: 'Independent members',
      }),
      'user-1',
    ]);
    expect(snapshotRepository.save.mock.calls).toContainEqual([
      expect.objectContaining({
        electoralRollId: 'roll-2',
        sourceRevision: 1,
        memberCount: 0,
      }),
    ]);
  });

  it('adds a member batch with one revision and one snapshot transactionally', async () => {
    const roll = createRoll();
    const rollRepository = createRollRepository(roll, []);
    const snapshotRepository = createSnapshotRepository();
    const transactionManager = immediateTransactionManager();

    const result = await new AddElectoralRollMembersHandler(
      rollRepository,
      new ElectoralRollSnapshotCreator(rollRepository, snapshotRepository),
      identityDataProtectorStub(),
      transactionManager,
    ).execute(
      AddElectoralRollMembersCommand.of({
        userPrincipalId: 'user-1',
        electoralRollId: roll.id,
        members: [
          {
            identifier: 'member-1',
            name: '최 선거',
            phoneNumber: '010-1234-5678',
            birthDate: '1990-01-02',
            groupKey: 'group-1',
            voteWeight: 2,
          },
          { identifier: 'member-2' },
        ],
        changedAt: now,
      }),
    );

    expect(result).toEqual({
      electoralRollId: roll.id,
      revision: 2,
      addedMemberCount: 2,
    });
    expect(rollRepository.saveMembers.mock.calls).toHaveLength(1);
    expect(rollRepository.saveMembers.mock.calls[0]?.[0]).toHaveLength(2);
    expect(rollRepository.save.mock.calls).toContainEqual([roll]);
    expect(snapshotRepository.save.mock.calls).toHaveLength(1);
    expect(snapshotRepository.save.mock.calls[0]?.[0]).toMatchObject({
      sourceRevision: 2,
      memberCount: 2,
      members: [
        expect.objectContaining({ identifier: 'member-1', voteWeight: 2 }),
        expect.objectContaining({ identifier: 'member-2', voteWeight: 1 }),
      ],
    });
    expect(snapshotRepository.save.mock.calls[0]?.[0]).toMatchObject({
      members: [
        expect.objectContaining({
          identityNameHash: 'name-hash:최 선거',
          identityPhoneNumberHash: 'phone-hash:010-1234-5678',
          identityBirthDateHash: 'birth-date-hash:1990-01-02',
          encryptedName: 'encrypted-name:최 선거',
          encryptedPhoneNumber: 'encrypted-phone:010-1234-5678',
          encryptedBirthDate: 'encrypted-birth-date:1990-01-02',
        }),
        expect.objectContaining({ identifier: 'member-2' }),
      ],
    });
    expect(transactionManager.runInTransaction.mock.calls[0]?.[1]).toEqual({
      isolationLevel: 'serializable',
    });
  });

  it('rejects an empty member batch', () => {
    expect(() =>
      AddElectoralRollMembersCommand.of({
        userPrincipalId: 'user-1',
        electoralRollId: 'roll-1',
        members: [],
        changedAt: now,
      }),
    ).toThrow('between 1 and 50000 members');
  });

  it('rejects a member batch larger than 50000 items', () => {
    expect(() =>
      AddElectoralRollMembersCommand.of({
        userPrincipalId: 'user-1',
        electoralRollId: 'roll-1',
        members: Array.from({ length: 50_001 }, (_, index) => ({
          identifier: `member-${index}`,
        })),
        changedAt: now,
      }),
    ).toThrow('between 1 and 50000 members');
  });

  it('rejects duplicate normalized identifiers before persistence', async () => {
    const roll = createRoll();
    const rollRepository = createRollRepository(roll, []);
    const handler = new AddElectoralRollMembersHandler(
      rollRepository,
      new ElectoralRollSnapshotCreator(
        rollRepository,
        createSnapshotRepository(),
      ),
      identityDataProtectorStub(),
      immediateTransactionManager(),
    );

    await expect(
      handler.execute(
        AddElectoralRollMembersCommand.of({
          userPrincipalId: 'user-1',
          electoralRollId: roll.id,
          members: [{ identifier: 'member-1' }, { identifier: ' member-1 ' }],
          changedAt: now,
        }),
      ),
    ).rejects.toThrow('duplicate electoral roll member identifier');
    expect(rollRepository.saveMembers.mock.calls).toHaveLength(0);
    expect(rollRepository.save.mock.calls).toHaveLength(0);
  });

  it('snapshots updated member values for the new source revision', async () => {
    const roll = createRoll();
    const sourceMember = ElectoralRollMemberAggregate.create({
      id: 'member-1',
      electoralRollId: roll.id,
      identifier: 'member-1',
      voteWeight: 2,
      createdAt: now,
    });
    const rollRepository = createRollRepository(roll, [sourceMember]);
    const snapshotRepository = createSnapshotRepository();
    const result = await new UpdateElectoralRollMemberHandler(
      rollRepository,
      new ElectoralRollSnapshotCreator(rollRepository, snapshotRepository),
      identityDataProtectorStub(),
      immediateTransactionManager(),
    ).execute(
      UpdateElectoralRollMemberCommand.of({
        userPrincipalId: 'user-1',
        electoralRollId: roll.id,
        memberId: sourceMember.id,
        identifier: 'updated-member',
        groupKey: 'updated-group',
        voteWeight: 3,
        name: '박 투표',
        phoneNumber: '010-9999-0000',
        birthDate: '1985-10-20',
        changedAt: now,
      }),
    );

    expect(result).toMatchObject({
      identifier: 'updated-member',
      revision: 2,
    });
    expect(snapshotRepository.save.mock.calls[0]?.[0]).toMatchObject({
      sourceRevision: 2,
      members: [
        {
          identifier: 'updated-member',
          groupKey: 'updated-group',
          voteWeight: 3,
          identityNameHash: 'name-hash:박 투표',
          identityPhoneNumberHash: 'phone-hash:010-9999-0000',
          identityBirthDateHash: 'birth-date-hash:1985-10-20',
        },
      ],
    });
  });

  it('snapshots the remaining members after a member is removed', async () => {
    const roll = createRoll();
    const sourceMember = ElectoralRollMemberAggregate.create({
      id: 'member-1',
      electoralRollId: roll.id,
      identifier: 'member-1',
      createdAt: now,
    });
    const rollRepository = createRollRepository(roll, [sourceMember]);
    const snapshotRepository = createSnapshotRepository();

    const result = await new RemoveElectoralRollMemberHandler(
      rollRepository,
      new ElectoralRollSnapshotCreator(rollRepository, snapshotRepository),
      immediateTransactionManager(),
    ).execute(
      RemoveElectoralRollMemberCommand.of({
        userPrincipalId: 'user-1',
        electoralRollId: roll.id,
        memberId: sourceMember.id,
        changedAt: now,
      }),
    );

    expect(result).toMatchObject({
      memberId: sourceMember.id,
      revision: 2,
    });
    expect(snapshotRepository.save.mock.calls[0]?.[0]).toMatchObject({
      sourceRevision: 2,
      memberCount: 0,
      members: [],
    });
  });

  it('creates at most one immutable snapshot per source revision', async () => {
    const roll = createRoll();
    const sourceMember = ElectoralRollMemberAggregate.create({
      id: 'member-1',
      electoralRollId: roll.id,
      identifier: 'member-1',
      voteWeight: 2,
      createdAt: now,
    });
    const rollRepository = createRollRepository(roll, [sourceMember]);
    const snapshotRepository = createSnapshotRepository();
    const creator = new ElectoralRollSnapshotCreator(
      rollRepository,
      snapshotRepository,
    );

    const first = await creator.createForCurrentRevision(roll, now);
    sourceMember.update(
      { identifier: 'changed-after-snapshot', voteWeight: 3 },
      new Date('2026-08-30T01:00:00.000Z'),
    );
    const second = await creator.createForCurrentRevision(
      roll,
      new Date('2026-08-30T02:00:00.000Z'),
    );

    expect(second.id).toBe(first.id);
    expect(snapshotRepository.save.mock.calls).toHaveLength(1);
    expect(first.members[0]).toMatchObject({
      identifier: 'member-1',
      voteWeight: 2,
    });
  });

  it('automatically resolves the current snapshot from an accessible roll', async () => {
    const roll = createRoll();
    const rollRepository = createRollRepository(roll, []);
    const snapshotRepository = createSnapshotRepository();
    const resolver = new ElectoralRollSnapshotResolver(
      rollRepository,
      snapshotRepository,
      new ElectoralRollSnapshotCreator(rollRepository, snapshotRepository),
      immediateTransactionManager(),
    );

    const snapshot = await resolver.resolveCurrent(roll.id, 'user-1', now);

    expect(rollRepository.findById.mock.calls).toContainEqual([
      roll.id,
      'user-1',
    ]);
    expect(snapshot).toMatchObject({
      electoralRollId: roll.id,
      sourceRevision: 1,
      memberCount: 0,
    });
    expect(snapshotRepository.save.mock.calls).toHaveLength(1);
  });

  it('attaches an accessible snapshot and materializes vote electors', async () => {
    const vote = createVote();
    const snapshot = createSnapshot();
    const voteRepository = createVoteRepository(vote);
    const snapshotAccess = createSnapshotAccess(snapshot);

    const result = await new AttachElectoralRollSnapshotHandler(
      voteRepository,
      snapshotAccess,
      voteLifecycleStub(),
      immediateTransactionManager(),
    ).execute(
      AttachElectoralRollSnapshotCommand.of({
        userPrincipalId: 'user-1',
        voteId: vote.id,
        electoralRollId: snapshot.electoralRollId,
        requestedAt: now,
      }),
    );

    expect(result).toMatchObject({
      voteId: vote.id,
      snapshotId: snapshot.id,
      memberCount: 0,
    });
    expect(vote.electoralRollSnapshotId).toBe(snapshot.id);
    expect(snapshotAccess.resolveCurrent.mock.calls).toContainEqual([
      snapshot.electoralRollId,
      'user-1',
      now,
    ]);
    expect(snapshotAccess.materializeVoteElectors.mock.calls).toEqual([
      [vote.id, snapshot.id],
    ]);
  });

  it('rejects an identity-verification vote when snapshot members have no matching data', async () => {
    const vote = createVote(true);
    const snapshot = ElectoralRollSnapshotAggregate.create({
      id: 'snapshot-1',
      electoralRollId: 'roll-1',
      rollName: 'Members',
      sourceRevision: 1,
      contentHash: 'a'.repeat(64),
      members: [
        ElectoralRollSnapshotMember.of({
          id: 'snapshot-member-1',
          sourceMemberId: 'member-1',
          identifier: 'member-1',
          voteWeight: 1,
        }),
      ],
      createdAt: now,
    });
    const snapshotAccess = createSnapshotAccess(snapshot);

    await expect(
      new AttachElectoralRollSnapshotHandler(
        createVoteRepository(vote),
        snapshotAccess,
        voteLifecycleStub(),
        immediateTransactionManager(),
      ).execute(
        AttachElectoralRollSnapshotCommand.of({
          userPrincipalId: 'user-1',
          voteId: vote.id,
          electoralRollId: snapshot.electoralRollId,
          requestedAt: now,
        }),
      ),
    ).rejects.toThrow('identity verification data');
    expect(snapshotAccess.materializeVoteElectors.mock.calls).toHaveLength(0);
  });

  it('does not overwrite manually managed vote electors', async () => {
    const vote = createVote();
    const snapshot = createSnapshot();
    const snapshotAccess = createSnapshotAccess(snapshot);
    snapshotAccess.hasVoteElectors.mockResolvedValue(true);

    await expect(
      new AttachElectoralRollSnapshotHandler(
        createVoteRepository(vote),
        snapshotAccess,
        voteLifecycleStub(),
        immediateTransactionManager(),
      ).execute(
        AttachElectoralRollSnapshotCommand.of({
          userPrincipalId: 'user-1',
          voteId: vote.id,
          electoralRollId: snapshot.electoralRollId,
          requestedAt: now,
        }),
      ),
    ).rejects.toThrow('manually managed electors');
    expect(snapshotAccess.materializeVoteElectors.mock.calls).toHaveLength(0);
  });

  it('hides a snapshot when the principal has no source-roll grant', async () => {
    const vote = createVote();
    const snapshotAccess = createSnapshotAccess();

    await expect(
      new AttachElectoralRollSnapshotHandler(
        createVoteRepository(vote),
        snapshotAccess,
        voteLifecycleStub(),
        immediateTransactionManager(),
      ).execute(
        AttachElectoralRollSnapshotCommand.of({
          userPrincipalId: 'unauthorized-user',
          voteId: vote.id,
          electoralRollId: 'roll-1',
          requestedAt: now,
        }),
      ),
    ).rejects.toThrow('electoral roll not found or access denied');
    expect(snapshotAccess.materializeVoteElectors.mock.calls).toHaveLength(0);
  });
});

function createRoll(): ElectoralRollAggregate {
  return ElectoralRollAggregate.create({
    id: 'roll-1',
    name: 'Members',
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
  });
}

function createRollRepository(
  roll: ElectoralRollAggregate,
  members: readonly ElectoralRollMemberAggregate[],
): jest.Mocked<ElectoralRollRepositoryPort> {
  const storedMembers = [...members];
  let memberSequence = storedMembers.length;

  return {
    softDelete: jest.fn(),
    nextId: jest.fn().mockReturnValue('roll-2'),
    nextMemberId: jest
      .fn()
      .mockImplementation(() => `member-${++memberSequence}`),
    findById: jest.fn().mockResolvedValue(roll),
    findMemberById: jest
      .fn()
      .mockImplementation((_rollId: string, memberId: string) =>
        Promise.resolve(storedMembers.find((member) => member.id === memberId)),
      ),
    findMembersByRollId: jest
      .fn()
      .mockImplementation(() => Promise.resolve([...storedMembers])),
    save: jest.fn(),
    create: jest.fn(),
    saveMember: jest
      .fn()
      .mockImplementation((member: ElectoralRollMemberAggregate) => {
        const existingIndex = storedMembers.findIndex(
          (storedMember) => storedMember.id === member.id,
        );
        if (existingIndex >= 0) storedMembers[existingIndex] = member;
        else storedMembers.push(member);
        return Promise.resolve();
      }),
    saveMembers: jest
      .fn()
      .mockImplementation(
        (savedMembers: readonly ElectoralRollMemberAggregate[]) => {
          storedMembers.push(...savedMembers);
          return Promise.resolve();
        },
      ),
    removeMember: jest
      .fn()
      .mockImplementation((_rollId: string, memberId: string) => {
        const existingIndex = storedMembers.findIndex(
          (member) => member.id === memberId,
        );
        if (existingIndex >= 0) storedMembers.splice(existingIndex, 1);
        return Promise.resolve();
      }),
  };
}

function createSnapshotRepository(
  snapshot?: ElectoralRollSnapshotAggregate,
): jest.Mocked<ElectoralRollSnapshotRepositoryPort> {
  let memberSequence = 0;
  const snapshots = snapshot ? [snapshot] : [];

  return {
    nextId: jest.fn().mockReturnValue('snapshot-1'),
    nextMemberId: jest
      .fn()
      .mockImplementation(() => `snapshot-member-${++memberSequence}`),
    findBySourceRevision: jest
      .fn()
      .mockImplementation((electoralRollId: string, sourceRevision: number) =>
        Promise.resolve(
          snapshots.find(
            (candidate) =>
              candidate.electoralRollId === electoralRollId &&
              candidate.sourceRevision === sourceRevision,
          ),
        ),
      ),
    save: jest
      .fn()
      .mockImplementation((savedSnapshot: ElectoralRollSnapshotAggregate) => {
        snapshots.push(savedSnapshot);
        return Promise.resolve();
      }),
    hasVoteElectors: jest.fn().mockResolvedValue(false),
    materializeVoteElectors: jest.fn(),
  };
}

function createSnapshotAccess(
  snapshot?: ElectoralRollSnapshotAggregate,
): jest.Mocked<ElectoralRollSnapshotAccessPort> {
  return {
    resolveCurrent: jest.fn().mockResolvedValue(snapshot),
    hasVoteElectors: jest.fn().mockResolvedValue(false),
    materializeVoteElectors: jest.fn(),
  };
}

function createSnapshot(): ElectoralRollSnapshotAggregate {
  return ElectoralRollSnapshotAggregate.create({
    id: 'snapshot-1',
    electoralRollId: 'roll-1',
    rollName: 'Members',
    sourceRevision: 1,
    contentHash: 'a'.repeat(64),
    members: [],
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
  });
}

function createVote(identityVerificationRequired = false): VoteAggregate {
  return VoteAggregate.create({
    id: 'vote-1',
    createdByUserPrincipalId: 'user-1',
    commissionId: 'commission-1',
    title: 'Vote',
    votingChannels: [VotingChannel.Online],
    defaultPolicy: VotePolicy.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Individual,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Equal,
    }),
    identityVerificationPolicy: IdentityVerificationPolicy.of({
      required: identityVerificationRequired,
      provider: identityVerificationRequired ? 'PASS' : undefined,
      method: identityVerificationRequired ? 'MOBILE' : undefined,
    }),
  });
}

function createVoteRepository(
  vote: VoteAggregate,
): jest.Mocked<VoteRepositoryPort> {
  return {
    nextId: jest.fn(),
    findById: jest.fn().mockResolvedValue(vote),
    save: jest.fn(),
  };
}

function immediateTransactionManager(): jest.Mocked<DatabaseTransactionManager> {
  return {
    runInTransaction: jest.fn(async (work: () => Promise<unknown>) =>
      work(),
    ) as jest.Mocked<DatabaseTransactionManager>['runInTransaction'],
  };
}

function voteLifecycleStub(): jest.Mocked<VoteSetupLifecyclePort> {
  return {
    lockVote: jest.fn().mockResolvedValue(undefined),
    lockForBilling: jest.fn().mockResolvedValue(undefined),
    finalizePaidBilling: jest.fn().mockResolvedValue(undefined),
    assertBillingCancellationAllowed: jest.fn().mockResolvedValue(undefined),
    releaseBilling: jest.fn().mockResolvedValue(undefined),
  };
}

function identityDataProtectorStub(): jest.Mocked<IdentityDataProtectorPort> {
  return {
    protectName: jest.fn((value) => ({
      encryptedValue: `encrypted-name:${value}`,
      hash: `name-hash:${value}`,
    })),
    protectPhoneNumber: jest.fn((value) => ({
      encryptedValue: `encrypted-phone:${value}`,
      hash: `phone-hash:${value}`,
    })),
    protectBirthDate: jest.fn((value) => ({
      encryptedValue: `encrypted-birth-date:${value}`,
      hash: `birth-date-hash:${value}`,
    })),
    reveal: jest.fn((value) => value),
  };
}
