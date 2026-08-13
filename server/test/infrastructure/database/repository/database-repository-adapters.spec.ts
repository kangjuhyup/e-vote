import { LoadStrategy } from '@mikro-orm/core';
import { AttachmentRepositoryAdapter } from '../../../../src/infrastructure/database/repository/attachment-repository.adapter';
import { ParticipationRepositoryAdapter } from '../../../../src/infrastructure/database/repository/participation-repository.adapter';
import { VoteRepositoryAdapter } from '../../../../src/infrastructure/database/repository/vote-repository.adapter';
import { VoteDetailRepositoryAdapter } from '../../../../src/infrastructure/database/repository/vote-detail-repository.adapter';
import { ElectorRepositoryAdapter } from '../../../../src/infrastructure/database/repository/elector-repository.adapter';
import { ElectionCommissionMemberRepositoryAdapter } from '../../../../src/infrastructure/database/repository/election-commission-member-repository.adapter';
import { FieldVotingSessionRepositoryAdapter } from '../../../../src/infrastructure/database/repository/field-voting-session-repository.adapter';
import { CandidateRepositoryAdapter } from '../../../../src/infrastructure/database/repository/candidate-repository.adapter';
import { ParticipationAggregate } from '../../../../src/domain/participation/participation.aggregate';
import { ElectorAggregate } from '../../../../src/domain/elector/elector.aggregate';
import { ElectorStatus } from '../../../../src/domain/elector/type/elector-status.type';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/domain/vote/type/vote-policy.type';
import { VotePolicy } from '../../../../src/domain/vote/vo/vote-policy.vo';
import { VotingChannel } from '../../../../src/domain/vote/type/voting-channel.type';
import {
  AttachmentTargetType,
  CandidateAttachmentType,
  VoteAttachmentType,
} from '../../../../src/application/port/attachment-repository.port';

type MockEntityManager = {
  readonly assign: jest.Mock<void, [object, Record<string, unknown>]>;
  readonly count: jest.Mock<Promise<number>, [unknown, unknown]>;
  readonly create: jest.Mock<
    Record<string, unknown>,
    [unknown, Record<string, unknown>]
  >;
  readonly find: jest.Mock<Promise<unknown[]>, [unknown, unknown, unknown?]>;
  readonly findOne: jest.Mock<Promise<unknown>, [unknown, unknown, unknown?]>;
  readonly flush: jest.Mock<Promise<void>, []>;
  readonly getReference: jest.Mock<{ id: unknown }, [unknown, unknown]>;
  readonly nativeDelete: jest.Mock<Promise<number>, [unknown, unknown]>;
  readonly persist: jest.Mock<void, [unknown]>;
};

describe('database repository adapters', () => {
  it('uses explicit joined relation loading for aggregate reconstitution', async () => {
    const em = createMockEntityManager();

    await new VoteRepositoryAdapter(em as any).findById('vote-1');
    expect(em.findOne.mock.calls[0][2]).toMatchObject({
      populate: ['commission', 'votingChannels'],
      strategy: LoadStrategy.JOINED,
    });

    await new VoteDetailRepositoryAdapter(em as any).findById('detail-1');
    expect(em.findOne.mock.calls[1][2]).toMatchObject({
      populate: ['vote'],
      strategy: LoadStrategy.JOINED,
    });

    await new CandidateRepositoryAdapter(em as any).findById('candidate-1');
    expect(em.findOne.mock.calls[2][2]).toMatchObject({
      populate: ['voteDetail'],
      strategy: LoadStrategy.JOINED,
    });

    await new ElectorRepositoryAdapter(em as any).findById(
      'vote-1',
      'elector-1',
    );
    expect(em.findOne.mock.calls[3][2]).toMatchObject({
      populate: ['vote', 'identityVerifications'],
      strategy: LoadStrategy.JOINED,
    });

    await new ParticipationRepositoryAdapter(em as any).findById(
      'participation-1',
    );
    expect(em.findOne.mock.calls[4][2]).toMatchObject({
      populate: ['voteDetail', 'elector', 'candidate', 'fieldVotingSession'],
      strategy: LoadStrategy.JOINED,
    });

    await new FieldVotingSessionRepositoryAdapter(em as any).findById(
      'session-1',
    );
    expect(em.findOne.mock.calls[5][2]).toMatchObject({
      populate: ['commission', 'vote', 'managerLinks.commissionMember'],
      strategy: LoadStrategy.JOINED,
    });

    await new ElectionCommissionMemberRepositoryAdapter(em as any).findByIds(
      'commission-1',
      ['member-1'],
    );
    expect(em.find.mock.calls[0][2]).toMatchObject({
      populate: ['commission'],
      strategy: LoadStrategy.JOINED,
    });

    await new ParticipationRepositoryAdapter(em as any).findCastByVoteDetailId(
      'detail-1',
    );
    expect(em.find.mock.calls[1][2]).toMatchObject({
      populate: ['voteDetail', 'elector', 'candidate', 'fieldVotingSession'],
      strategy: LoadStrategy.JOINED,
    });
  });

  it('persists secret participation without selected candidate relation', async () => {
    const em = createMockEntityManager();
    const elector = ElectorAggregate.create({
      id: 'elector-1',
      voteId: 'vote-1',
      identifier: 'member-1',
      status: ElectorStatus.Eligible,
    });
    const participation = ParticipationAggregate.cast({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      elector,
      selectedCandidateId: 'candidate-1',
      effectivePolicy: VotePolicy.of({
        privacyMode: PrivacyMode.Secret,
        participationUnit: ParticipationUnit.Individual,
        resultStorageMode: ResultStorageMode.Database,
        voteWeightMode: VoteWeightMode.Equal,
      }),
      votingChannel: VotingChannel.Online,
      participatedAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    await new ParticipationRepositoryAdapter(em as any).save(participation);

    expect(em.create).toHaveBeenCalledTimes(1);
    expect(em.create.mock.calls[0][1]).toMatchObject({
      id: 'participation-1',
      candidate: null,
      fieldVotingSession: null,
      voteWeight: 1,
      votingChannel: VotingChannel.Online,
    });
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('persists uploaded file metadata and a vote attachment link', async () => {
    const em = createMockEntityManager();

    const result = await new AttachmentRepositoryAdapter(
      em as any,
    ).saveAttachedFile({
      target: {
        targetType: AttachmentTargetType.Vote,
        voteId: 'vote-1',
      },
      attachmentType: VoteAttachmentType.Notice,
      sortOrder: 1,
      file: {
        storageKey: 'attachments/vote-key',
        originalName: 'notice.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        checksum: 'sha256:notice',
      },
    });

    expect(result).toMatchObject({
      storageKey: 'attachments/vote-key',
    });
    expect(createdData(em, 0)).toMatchObject({
      storageKey: 'attachments/vote-key',
      originalName: 'notice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      checksum: 'sha256:notice',
      status: 'ACTIVE',
    });
    const voteAttachmentData = createdData(em, 1);
    expect(voteAttachmentData).toMatchObject({
      vote: { id: 'vote-1' },
      type: VoteAttachmentType.Notice,
      sortOrder: 1,
    });
    expect(voteAttachmentData.file).toMatchObject({
      storageKey: 'attachments/vote-key',
    });
    expect(em.persist).toHaveBeenCalledTimes(2);
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('persists uploaded file metadata and a candidate attachment link', async () => {
    const em = createMockEntityManager();

    await new AttachmentRepositoryAdapter(em as any).saveAttachedFile({
      target: {
        targetType: AttachmentTargetType.Candidate,
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
        candidateId: 'candidate-1',
      },
      attachmentType: CandidateAttachmentType.Poster,
      sortOrder: 2,
      file: {
        storageKey: 'attachments/candidate-key',
        originalName: 'poster.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
      },
    });

    const candidateAttachmentData = createdData(em, 1);
    expect(candidateAttachmentData).toMatchObject({
      candidate: { id: 'candidate-1' },
      type: CandidateAttachmentType.Poster,
      sortOrder: 2,
    });
    expect(candidateAttachmentData.file).toMatchObject({
      storageKey: 'attachments/candidate-key',
    });
  });

  it('persists uploaded file metadata and a vote detail attachment link', async () => {
    const em = createMockEntityManager();

    await new AttachmentRepositoryAdapter(em as any).saveAttachedFile({
      target: {
        targetType: AttachmentTargetType.VoteDetail,
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
      },
      attachmentType: VoteAttachmentType.Guide,
      sortOrder: 3,
      file: {
        storageKey: 'attachments/detail-key',
        originalName: 'guide.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 4096,
      },
    });

    const voteDetailAttachmentData = createdData(em, 1);
    expect(voteDetailAttachmentData).toMatchObject({
      voteDetail: { id: 'detail-1' },
      type: VoteAttachmentType.Guide,
      sortOrder: 3,
    });
    expect(voteDetailAttachmentData.file).toMatchObject({
      storageKey: 'attachments/detail-key',
    });
  });
});

function createdData(
  em: MockEntityManager,
  callIndex: number,
): Record<string, unknown> {
  const call = em.create.mock.calls[callIndex];

  if (!call) {
    throw new Error('expected entity creation call');
  }

  return call[1];
}

function createMockEntityManager(): MockEntityManager {
  return {
    assign: jest.fn<void, [object, Record<string, unknown>]>(),
    count: jest.fn<Promise<number>, [unknown, unknown]>().mockResolvedValue(0),
    create: jest.fn<
      Record<string, unknown>,
      [unknown, Record<string, unknown>]
    >((_entityClass, data) => data),
    find: jest
      .fn<Promise<unknown[]>, [unknown, unknown, unknown?]>()
      .mockResolvedValue([]),
    findOne: jest
      .fn<Promise<unknown>, [unknown, unknown, unknown?]>()
      .mockResolvedValue(null),
    flush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    getReference: jest.fn<{ id: unknown }, [unknown, unknown]>(
      (_entityClass, id) => ({ id }),
    ),
    nativeDelete: jest
      .fn<Promise<number>, [unknown, unknown]>()
      .mockResolvedValue(0),
    persist: jest.fn<void, [unknown]>(),
  };
}
