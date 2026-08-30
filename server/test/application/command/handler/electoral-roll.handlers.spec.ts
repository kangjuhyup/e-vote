import { AddElectoralRollMembersCommand } from '../../../../src/modules/electoral-roll/application/command/dto/request/add-electoral-roll-members.command';
import { AttachElectoralRollSnapshotCommand } from '../../../../src/modules/vote/application/command/dto/request/attach-electoral-roll-snapshot.command';
import { RemoveElectoralRollMemberCommand } from '../../../../src/modules/electoral-roll/application/command/dto/request/remove-electoral-roll-member.command';
import { UpdateElectoralRollMemberCommand } from '../../../../src/modules/electoral-roll/application/command/dto/request/update-electoral-roll-member.command';
import { ElectoralRollSnapshotCreator } from '../../../../src/modules/electoral-roll/application/command/electoral-roll-snapshot.creator';
import { AddElectoralRollMembersHandler } from '../../../../src/modules/electoral-roll/application/command/handler/add-electoral-roll-members.handler';
import { AttachElectoralRollSnapshotHandler } from '../../../../src/modules/vote/application/command/handler/attach-electoral-roll-snapshot.handler';
import { RemoveElectoralRollMemberHandler } from '../../../../src/modules/electoral-roll/application/command/handler/remove-electoral-roll-member.handler';
import { UpdateElectoralRollMemberHandler } from '../../../../src/modules/electoral-roll/application/command/handler/update-electoral-roll-member.handler';
import type { ElectoralRollRepositoryPort } from '../../../../src/modules/electoral-roll/application/port/persistence/command/electoral-roll-repository.port';
import type { ElectoralRollSnapshotRepositoryPort } from '../../../../src/modules/electoral-roll/application/port/persistence/command/electoral-roll-snapshot-repository.port';
import type { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';
import { ElectoralRollAggregate } from '../../../../src/modules/electoral-roll/domain/electoral-roll.aggregate';
import { ElectoralRollMemberAggregate } from '../../../../src/modules/electoral-roll/domain/electoral-roll-member.aggregate';
import { ElectoralRollSnapshotAggregate } from '../../../../src/modules/electoral-roll/domain/electoral-roll-snapshot.aggregate';
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

describe('electoral roll command handlers', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');

  it('adds a member batch with one revision and one snapshot transactionally', async () => {
    const roll = createRoll();
    const rollRepository = createRollRepository(roll, []);
    const snapshotRepository = createSnapshotRepository();
    const transactionManager = immediateTransactionManager();

    const result = await new AddElectoralRollMembersHandler(
      rollRepository,
      new ElectoralRollSnapshotCreator(rollRepository, snapshotRepository),
      transactionManager,
    ).execute(
      AddElectoralRollMembersCommand.of({
        electoralRollId: roll.id,
        members: [
          { identifier: 'member-1', groupKey: 'group-1', voteWeight: 2 },
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
    expect(transactionManager.runInTransaction.mock.calls[0]?.[1]).toEqual({
      isolationLevel: 'serializable',
    });
  });

  it('rejects an empty member batch', () => {
    expect(() =>
      AddElectoralRollMembersCommand.of({
        electoralRollId: 'roll-1',
        members: [],
        changedAt: now,
      }),
    ).toThrow('between 1 and 50000 members');
  });

  it('rejects a member batch larger than 50000 items', () => {
    expect(() =>
      AddElectoralRollMembersCommand.of({
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
      immediateTransactionManager(),
    );

    await expect(
      handler.execute(
        AddElectoralRollMembersCommand.of({
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
      immediateTransactionManager(),
    ).execute(
      UpdateElectoralRollMemberCommand.of({
        electoralRollId: roll.id,
        memberId: sourceMember.id,
        identifier: 'updated-member',
        groupKey: 'updated-group',
        voteWeight: 3,
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

  it('attaches a same-commission snapshot and materializes vote electors', async () => {
    const vote = createVote();
    const snapshot = createSnapshot();
    const voteRepository = createVoteRepository(vote);
    const snapshotRepository = createSnapshotRepository(snapshot);

    const result = await new AttachElectoralRollSnapshotHandler(
      voteRepository,
      snapshotRepository,
      immediateTransactionManager(),
    ).execute(
      AttachElectoralRollSnapshotCommand.of({
        voteId: vote.id,
        snapshotId: snapshot.id,
      }),
    );

    expect(result).toMatchObject({
      voteId: vote.id,
      snapshotId: snapshot.id,
      memberCount: 0,
    });
    expect(vote.electoralRollSnapshotId).toBe(snapshot.id);
    expect(snapshotRepository.materializeVoteElectors.mock.calls).toEqual([
      [vote.id, snapshot.id],
    ]);
  });

  it('does not overwrite manually managed vote electors', async () => {
    const vote = createVote();
    const snapshot = createSnapshot();
    const snapshotRepository = createSnapshotRepository(snapshot);
    snapshotRepository.hasVoteElectors.mockResolvedValue(true);

    await expect(
      new AttachElectoralRollSnapshotHandler(
        createVoteRepository(vote),
        snapshotRepository,
        immediateTransactionManager(),
      ).execute(
        AttachElectoralRollSnapshotCommand.of({
          voteId: vote.id,
          snapshotId: snapshot.id,
        }),
      ),
    ).rejects.toThrow('manually managed electors');
    expect(snapshotRepository.materializeVoteElectors.mock.calls).toHaveLength(
      0,
    );
  });
});

function createRoll(): ElectoralRollAggregate {
  return ElectoralRollAggregate.create({
    id: 'roll-1',
    commissionId: 'commission-1',
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
    findById: jest.fn().mockResolvedValue(snapshot),
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

function createSnapshot(): ElectoralRollSnapshotAggregate {
  return ElectoralRollSnapshotAggregate.create({
    id: 'snapshot-1',
    electoralRollId: 'roll-1',
    commissionId: 'commission-1',
    rollName: 'Members',
    sourceRevision: 1,
    contentHash: 'a'.repeat(64),
    members: [],
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
  });
}

function createVote(): VoteAggregate {
  return VoteAggregate.create({
    id: 'vote-1',
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
      required: false,
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
    runInTransaction: jest.fn(async (work) => work()),
  };
}
