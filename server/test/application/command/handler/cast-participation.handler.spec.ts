import { CastParticipationCommand } from '../../../../src/modules/participation/application/command/dto/request/cast-participation.command';
import { CastParticipationHandler } from '../../../../src/modules/participation/application/command/handler/cast-participation.handler';
import { CandidateRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/candidate-repository.port';
import { ElectorRepositoryPort } from '../../../../src/modules/elector/application/port/persistence/command/elector-repository.port';
import { FieldVotingSessionRepositoryPort } from '../../../../src/modules/field-voting/application/port/persistence/command/field-voting-session-repository.port';
import { ParticipationRepositoryPort } from '../../../../src/modules/participation/application/port/persistence/command/participation-repository.port';
import { CastParticipationTransactionResources } from '../../../../src/modules/participation/application/port/persistence/command/participation-repository.port';
import { VoteDetailRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-detail-repository.port';
import { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import { CandidateAggregate } from '../../../../src/modules/vote/domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../../../src/shared/domain/voting/type/candidate-status.type';
import { ElectionCommissionAggregate } from '../../../../src/modules/election-commission/domain/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../../src/modules/election-commission/domain/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../../src/modules/election-commission/domain/type/election-commission-member-role.type';
import { ElectorAggregate } from '../../../../src/modules/elector/domain/elector.aggregate';
import { ElectorStatus } from '../../../../src/shared/domain/voting/type/elector-status.type';
import { FieldVotingSessionAggregate } from '../../../../src/modules/field-voting/domain/field-voting-session.aggregate';
import { ParticipationAggregate } from '../../../../src/modules/participation/domain/participation.aggregate';
import { ParticipationStatus } from '../../../../src/shared/domain/voting/type/participation-status.type';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../src/shared/domain/voting/vo/vote-policy.vo';
import { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';
import { VoteDetailAggregate } from '../../../../src/modules/vote/domain/vote/vote-detail.aggregate';

function createVoteFixture(
  status: VoteStatus = VoteStatus.Open,
  votingChannels: readonly VotingChannel[] = [VotingChannel.Onsite],
): VoteAggregate {
  return VoteAggregate.create({
    id: 'vote-1',
    createdByUserPrincipalId: 'user-1',
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
    status,
  });
}

function createVoteDetailFixture(
  status: VoteDetailStatus = VoteDetailStatus.Open,
): VoteDetailAggregate {
  return VoteDetailAggregate.create({
    id: 'detail-1',
    voteId: 'vote-1',
    title: 'President',
    type: 'CANDIDATE',
    sortOrder: 0,
    status,
  });
}

function createElectorFixture(): ElectorAggregate {
  return ElectorAggregate.create({
    id: 'elector-1',
    voteId: 'vote-1',
    identifier: 'member-1',
    voteWeight: 1,
    status: ElectorStatus.Eligible,
  });
}

function createCandidateFixture(params?: {
  voteDetailId?: string;
  status?: CandidateStatus;
}): CandidateAggregate {
  return CandidateAggregate.create({
    id: 'candidate-1',
    voteDetailId: params?.voteDetailId ?? 'detail-1',
    candidateNo: 1,
    name: 'Candidate 1',
    status: params?.status ?? CandidateStatus.Active,
  });
}

function createOpenFieldVotingSessionFixture(): FieldVotingSessionAggregate {
  const session = FieldVotingSessionAggregate.schedule({
    id: 'session-1',
    commission: ElectionCommissionAggregate.create({
      id: 'commission-1',
      name: 'Main Commission',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    }),
    vote: createVoteFixture(),
    channel: VotingChannel.Onsite,
    title: 'Lobby voting desk',
    locationName: 'Main Lobby',
    address: 'Seoul Office',
    managers: [
      ElectionCommissionMemberAggregate.create({
        id: 'member-1',
        commissionId: 'commission-1',
        userPrincipalId: 'user-1',
        name: 'Kim Manager',
        role: ElectionCommissionMemberRole.FieldManager,
        registeredAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    ],
    startsAt: new Date('2026-08-20T00:00:00.000Z'),
    endsAt: new Date('2026-08-20T09:00:00.000Z'),
    scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
  });
  session.open(new Date('2026-08-20T00:00:00.000Z'));

  return session;
}

describe('CastParticipationHandler', () => {
  it('rejects another principal or an unverified elector before saving a ballot', async () => {
    const f = createHandlerFixture();
    f.participantAccess.isAuthorized.mockResolvedValue(false);
    await expect(f.handler.execute(createCastCommand())).rejects.toThrow(
      'does not own this elector',
    );
    expect(f.participantAccess.isAuthorized).toHaveBeenCalledWith(
      'vote-1',
      'elector-1',
      'user-1',
    );
    expect(f.saveCastWithResult).not.toHaveBeenCalled();
  });
  it('casts onsite participation through an open field voting session', async () => {
    const fixture = createHandlerFixture();

    const result = await fixture.handler.execute(createCastCommand());

    expect(result).toEqual({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      status: ParticipationStatus.Cast,
    });
    expect(fixture.saveCastWithResult).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: undefined,
        votingChannel: VotingChannel.Onsite,
        fieldVotingSessionId: 'session-1',
      }),
      'candidate-1',
    );
    expect(fixture.save).not.toHaveBeenCalled();
    expect(fixture.runCastTransaction).toHaveBeenCalledWith({
      voteId: 'vote-1',
      voteDetailId: 'detail-1',
      electorId: 'elector-1',
      candidateId: 'candidate-1',
      fieldVotingSessionId: 'session-1',
    });
  });

  it('rejects participation until the elector signature upload is confirmed', async () => {
    const fixture = createHandlerFixture({ signatureConfirmed: false });

    await expect(fixture.handler.execute(createCastCommand())).rejects.toThrow(
      'confirmed elector signature is required for participation',
    );
    expect(fixture.signatureAccess.hasConfirmedSignature).toHaveBeenCalledWith(
      'vote-1',
      'elector-1',
    );
    expect(fixture.saveCastWithResult).not.toHaveBeenCalled();
  });

  it('also requires a confirmed image signature for online participation', async () => {
    const fixture = createHandlerFixture({
      signatureConfirmed: false,
      votingChannels: [VotingChannel.Online],
    });

    await expect(
      fixture.handler.execute(
        createCastCommand({
          votingChannel: VotingChannel.Online,
          fieldVotingSessionId: undefined,
        }),
      ),
    ).rejects.toThrow('confirmed elector signature is required');

    expect(fixture.signatureAccess.hasConfirmedSignature).toHaveBeenCalledWith(
      'vote-1',
      'elector-1',
    );
    expect(fixture.saveCastWithResult).not.toHaveBeenCalled();
  });

  it.each([VoteStatus.Draft, VoteStatus.Closed, VoteStatus.Canceled])(
    'rejects participation while the parent vote is %s',
    async (status) => {
      const fixture = createHandlerFixture({ voteStatus: status });

      await expect(
        fixture.handler.execute(createCastCommand()),
      ).rejects.toThrow('vote must be open for participation');
      expect(fixture.saveCastWithResult).not.toHaveBeenCalled();
    },
  );

  it.each([
    VoteDetailStatus.Draft,
    VoteDetailStatus.Closed,
    VoteDetailStatus.Canceled,
  ])('rejects participation while the vote detail is %s', async (status) => {
    const fixture = createHandlerFixture({ voteDetailStatus: status });

    await expect(fixture.handler.execute(createCastCommand())).rejects.toThrow(
      'vote detail must be open for participation',
    );
    expect(fixture.saveCastWithResult).not.toHaveBeenCalled();
  });

  it('rejects a voting channel that the vote does not allow', async () => {
    const fixture = createHandlerFixture();

    await expect(
      fixture.handler.execute(
        createCastCommand({
          votingChannel: VotingChannel.Online,
          fieldVotingSessionId: undefined,
        }),
      ),
    ).rejects.toThrow('vote does not allow requested voting channel');
    expect(fixture.saveCastWithResult).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    [
      'owned by another vote detail',
      createCandidateFixture({ voteDetailId: 'detail-2' }),
    ],
    [
      'withdrawn',
      createCandidateFixture({ status: CandidateStatus.Withdrawn }),
    ],
  ] as const)('rejects a %s candidate', async (_label, candidate) => {
    const fixture = createHandlerFixture({ candidate });

    await expect(fixture.handler.execute(createCastCommand())).rejects.toThrow(
      'candidate not found',
    );
    expect(fixture.saveCastWithResult).not.toHaveBeenCalled();
  });
});

type HandlerFixtureOptions = {
  readonly voteStatus?: VoteStatus;
  readonly voteDetailStatus?: VoteDetailStatus;
  readonly candidate?: CandidateAggregate;
  readonly signatureConfirmed?: boolean;
  readonly votingChannels?: readonly VotingChannel[];
};

function createHandlerFixture(options: HandlerFixtureOptions = {}) {
  const save = jest
    .fn<Promise<void>, [ParticipationAggregate]>()
    .mockResolvedValue(undefined);
  const saveCastWithResult = jest
    .fn<Promise<void>, [ParticipationAggregate, string]>()
    .mockResolvedValue(undefined);
  const runCastTransaction = jest.fn<
    void,
    [CastParticipationTransactionResources]
  >();
  const voteRepository: VoteRepositoryPort = {
    nextId: jest.fn().mockReturnValue('vote-unused'),
    findById: jest
      .fn()
      .mockResolvedValue(
        createVoteFixture(options.voteStatus, options.votingChannels),
      ),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const voteDetailRepository: VoteDetailRepositoryPort = {
    nextId: jest.fn().mockReturnValue('detail-unused'),
    findById: jest
      .fn()
      .mockResolvedValue(createVoteDetailFixture(options.voteDetailStatus)),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const electorRepository: ElectorRepositoryPort = {
    nextId: jest.fn().mockReturnValue('elector-unused'),
    findById: jest.fn().mockResolvedValue(createElectorFixture()),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const participationRepository: ParticipationRepositoryPort = {
    nextId: jest.fn().mockReturnValue('participation-1'),
    runCastTransaction: <T>(
      resources: CastParticipationTransactionResources,
      work: () => Promise<T>,
    ): Promise<T> => {
      runCastTransaction(resources);

      return work();
    },
    findById: jest.fn().mockResolvedValue(undefined),
    findCastByVoteDetailId: jest.fn().mockResolvedValue([]),
    save,
    saveCastWithResult,
  };
  const candidateRepository: CandidateRepositoryPort = {
    nextId: jest.fn().mockReturnValue('candidate-unused'),
    findById: jest
      .fn()
      .mockResolvedValue(
        Object.prototype.hasOwnProperty.call(options, 'candidate')
          ? options.candidate
          : createCandidateFixture(),
      ),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const fieldVotingSessionRepository: FieldVotingSessionRepositoryPort = {
    nextId: jest.fn().mockReturnValue('session-unused'),
    findById: jest
      .fn()
      .mockResolvedValue(createOpenFieldVotingSessionFixture()),
    save: jest.fn().mockResolvedValue(undefined),
  };

  const participantAccess = { isAuthorized: jest.fn().mockResolvedValue(true) };
  const signatureAccess = {
    hasConfirmedSignature: jest
      .fn()
      .mockResolvedValue(options.signatureConfirmed ?? true),
  };
  return {
    participantAccess,
    signatureAccess,
    handler: new CastParticipationHandler(
      voteRepository,
      voteDetailRepository,
      electorRepository,
      candidateRepository,
      participationRepository,
      fieldVotingSessionRepository,
      participantAccess,
      signatureAccess,
    ),
    runCastTransaction,
    save,
    saveCastWithResult,
  };
}

function createCastCommand(
  overrides: Partial<{
    votingChannel: VotingChannel;
    fieldVotingSessionId: string | undefined;
  }> = {},
): CastParticipationCommand {
  return CastParticipationCommand.of({
    userPrincipalId: 'user-1',
    voteId: 'vote-1',
    voteDetailId: 'detail-1',
    electorId: 'elector-1',
    selectedCandidateId: 'candidate-1',
    votingChannel: overrides.votingChannel ?? VotingChannel.Onsite,
    fieldVotingSessionId:
      'fieldVotingSessionId' in overrides
        ? overrides.fieldVotingSessionId
        : 'session-1',
    participatedAt: new Date('2026-08-20T01:00:00.000Z'),
  });
}
