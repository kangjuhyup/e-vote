import { AddElectoralRollMemberCommand } from '../../../../src/application/command/dto/request/add-electoral-roll-member.command';
import { AttachElectoralRollSnapshotCommand } from '../../../../src/application/command/dto/request/attach-electoral-roll-snapshot.command';
import { CreateElectoralRollSnapshotCommand } from '../../../../src/application/command/dto/request/create-electoral-roll-snapshot.command';
import { AddElectoralRollMemberHandler } from '../../../../src/application/command/handler/add-electoral-roll-member.handler';
import { AttachElectoralRollSnapshotHandler } from '../../../../src/application/command/handler/attach-electoral-roll-snapshot.handler';
import { CreateElectoralRollSnapshotHandler } from '../../../../src/application/command/handler/create-electoral-roll-snapshot.handler';
import type { ElectoralRollRepositoryPort } from '../../../../src/application/port/persistence/command/electoral-roll-repository.port';
import type { ElectoralRollSnapshotRepositoryPort } from '../../../../src/application/port/persistence/command/electoral-roll-snapshot-repository.port';
import type { VoteRepositoryPort } from '../../../../src/application/port/persistence/command/vote-repository.port';
import type { DatabaseTransactionManager } from '../../../../src/application/port/persistence/transaction/database-transaction-manager.port';
import { ElectoralRollAggregate } from '../../../../src/domain/electoral-roll/electoral-roll.aggregate';
import { ElectoralRollMemberAggregate } from '../../../../src/domain/electoral-roll/electoral-roll-member.aggregate';
import { ElectoralRollSnapshotAggregate } from '../../../../src/domain/electoral-roll/electoral-roll-snapshot.aggregate';
import { VoteAggregate } from '../../../../src/domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/domain/vote/type/vote-policy.type';
import { VotingChannel } from '../../../../src/domain/vote/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../../src/domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../src/domain/vote/vo/vote-policy.vo';

describe('electoral roll command handlers', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');

  it('adds a member and increments the source revision transactionally', async () => {
    const roll = createRoll();
    const rollRepository = createRollRepository(roll, []);
    const transactionManager = immediateTransactionManager();

    const result = await new AddElectoralRollMemberHandler(
      rollRepository,
      transactionManager,
    ).execute(
      AddElectoralRollMemberCommand.of({
        electoralRollId: roll.id,
        identifier: 'member-1',
        groupKey: 'group-1',
        voteWeight: 2,
        changedAt: now,
      }),
    );

    expect(result).toMatchObject({ identifier: 'member-1', revision: 2 });
    expect(rollRepository.saveMember.mock.calls).toHaveLength(1);
    expect(rollRepository.save.mock.calls).toEqual([[roll]]);
    expect(transactionManager.runInTransaction.mock.calls[0]?.[1]).toEqual({
      isolationLevel: 'serializable',
    });
  });

  it('creates one immutable snapshot per source revision', async () => {
    const roll = createRoll();
    const sourceMember = ElectoralRollMemberAggregate.create({
      id: 'member-1',
      electoralRollId: roll.id,
      identifier: 'member-1',
      voteWeight: 2,
      createdAt: now,
    });
    const rollRepository = createRollRepository(roll, [sourceMember]);
    let savedSnapshot: ElectoralRollSnapshotAggregate | undefined;
    const snapshotRepository = createSnapshotRepository();
    snapshotRepository.findBySourceRevision.mockImplementation(() =>
      Promise.resolve(savedSnapshot),
    );
    snapshotRepository.save.mockImplementation((snapshot) => {
      savedSnapshot = snapshot;
      return Promise.resolve();
    });
    const handler = new CreateElectoralRollSnapshotHandler(
      rollRepository,
      snapshotRepository,
      immediateTransactionManager(),
    );

    const first = await handler.execute(
      CreateElectoralRollSnapshotCommand.of({
        electoralRollId: roll.id,
        createdAt: now,
      }),
    );
    sourceMember.update(
      { identifier: 'changed-after-snapshot', voteWeight: 3 },
      new Date('2026-08-30T01:00:00.000Z'),
    );
    const second = await handler.execute(
      CreateElectoralRollSnapshotCommand.of({
        electoralRollId: roll.id,
        createdAt: new Date('2026-08-30T02:00:00.000Z'),
      }),
    );

    expect(second.id).toBe(first.id);
    expect(snapshotRepository.save.mock.calls).toHaveLength(1);
    expect(savedSnapshot?.members[0]).toMatchObject({
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
  return {
    nextId: jest.fn().mockReturnValue('roll-2'),
    nextMemberId: jest.fn().mockReturnValue('member-2'),
    findById: jest.fn().mockResolvedValue(roll),
    findMemberById: jest.fn(),
    findMembersByRollId: jest.fn().mockResolvedValue(members),
    save: jest.fn(),
    saveMember: jest.fn(),
    removeMember: jest.fn(),
  };
}

function createSnapshotRepository(
  snapshot?: ElectoralRollSnapshotAggregate,
): jest.Mocked<ElectoralRollSnapshotRepositoryPort> {
  let memberSequence = 0;
  return {
    nextId: jest.fn().mockReturnValue('snapshot-1'),
    nextMemberId: jest
      .fn()
      .mockImplementation(() => `snapshot-member-${++memberSequence}`),
    findById: jest.fn().mockResolvedValue(snapshot),
    findBySourceRevision: jest.fn().mockResolvedValue(undefined),
    save: jest.fn(),
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
