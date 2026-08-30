import type { VoteStatisticsReadRepositoryPort } from '../../../../src/application/port/persistence/query/vote-statistics-read-repository.port';
import { GetVoteResultHandler } from '../../../../src/application/query/handler/get-vote-result.handler';
import { GetVoteResultQuery } from '../../../../src/application/query/dto/request/get-vote-result.query';
import { GetVoteTurnoutHandler } from '../../../../src/application/query/handler/get-vote-turnout.handler';
import { GetVoteTurnoutQuery } from '../../../../src/application/query/dto/request/get-vote-turnout.query';
import {
  CandidateVoteResultView,
  VoteResultView,
  VotingChannelResultView,
} from '../../../../src/application/query/dto/response/vote-result.view';
import { VoteTurnoutView } from '../../../../src/application/query/dto/response/vote-turnout.view';
import {
  VoteResultUnavailableError,
  VoteStatisticsInconsistentError,
  VoteStatisticsNotFoundError,
} from '../../../../src/application/query/vote-statistics.error';
import { CandidateStatus } from '../../../../src/domain/candidate/type/candidate-status.type';
import {
  ParticipationUnit,
  PrivacyMode,
  VoteWeightMode,
} from '../../../../src/domain/vote/type/vote-policy.type';
import { VotingChannel } from '../../../../src/domain/vote/type/voting-channel.type';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../src/domain/vote/type/vote-status.type';

describe('vote statistics query handlers', () => {
  const turnout = VoteTurnoutView.of({
    voteId: 'vote-1',
    voteDetailId: 'vote-detail-1',
    participationUnit: ParticipationUnit.Individual,
    voteWeightMode: VoteWeightMode.Share,
    groupVoteWeightConsistent: true,
    eligibleElectorCount: 4,
    eligibleVotingUnitCount: 4,
    participantCount: 3,
    participatedVotingUnitCount: 3,
    turnoutRate: 75,
    eligibleVoteWeight: 10,
    participatedVoteWeight: 6,
    weightedTurnoutRate: 60,
  });
  const result = VoteResultView.of({
    voteId: 'vote-1',
    voteDetailId: 'vote-detail-1',
    voteStatus: VoteStatus.Closed,
    voteDetailStatus: VoteDetailStatus.Closed,
    privacyMode: PrivacyMode.Secret,
    participationUnit: ParticipationUnit.Individual,
    voteWeightMode: VoteWeightMode.Share,
    participantCount: 3,
    participatedVoteWeight: 6,
    totalVoteCount: 3,
    totalWeightedVoteCount: 6,
    candidates: [
      CandidateVoteResultView.of({
        candidateId: 'candidate-1',
        candidateNo: 1,
        name: 'Candidate 1',
        status: CandidateStatus.Active,
        voteCount: 2,
        voteRate: 66.67,
        weightedVoteCount: 4.5,
        weightedVoteRate: 75,
      }),
    ],
    votingChannels: [
      VotingChannelResultView.of({
        channel: VotingChannel.Online,
        participantCount: 2,
        participationRate: 66.67,
        participatedVoteWeight: 5,
        weightedParticipationRate: 83.33,
      }),
    ],
  });

  it('returns turnout for the requested child vote', async () => {
    const repository = createRepository();
    repository.getTurnout.mockResolvedValue(turnout);

    await expect(
      new GetVoteTurnoutHandler(repository).execute(
        GetVoteTurnoutQuery.of({
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
        }),
      ),
    ).resolves.toBe(turnout);
    expect(repository.getTurnout).toHaveBeenCalledWith(
      'vote-1',
      'vote-detail-1',
    );
  });

  it('returns aggregate results without elector-to-candidate linkage', async () => {
    const repository = createRepository();
    repository.getResult.mockResolvedValue(result);

    await expect(
      new GetVoteResultHandler(repository).execute(
        GetVoteResultQuery.of({
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
        }),
      ),
    ).resolves.toBe(result);
    expect(repository.getResult).toHaveBeenCalledWith(
      'vote-1',
      'vote-detail-1',
    );
    expect(result).not.toHaveProperty('electors');
  });

  it.each(['turnout', 'result'] as const)(
    'throws when the requested child vote is missing for %s',
    async (resource) => {
      const repository = createRepository();
      repository.getTurnout.mockResolvedValue(undefined);
      repository.getResult.mockResolvedValue(undefined);
      const handler =
        resource === 'turnout'
          ? new GetVoteTurnoutHandler(repository)
          : new GetVoteResultHandler(repository);
      const query =
        resource === 'turnout'
          ? GetVoteTurnoutQuery.of({
              voteId: 'vote-1',
              voteDetailId: 'missing',
            })
          : GetVoteResultQuery.of({
              voteId: 'vote-1',
              voteDetailId: 'missing',
            });

      await expect(handler.execute(query as never)).rejects.toBeInstanceOf(
        VoteStatisticsNotFoundError,
      );
    },
  );

  it('rejects candidate results before parent and child votes are closed', async () => {
    const repository = createRepository();
    repository.getResult.mockResolvedValue(
      VoteResultView.of({
        ...result,
        voteStatus: VoteStatus.Open,
      }),
    );

    await expect(
      new GetVoteResultHandler(repository).execute(
        GetVoteResultQuery.of({
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
        }),
      ),
    ).rejects.toBeInstanceOf(VoteResultUnavailableError);
  });

  it.each([
    {
      label: 'vote count',
      result: VoteResultView.of({
        ...result,
        totalVoteCount: result.participantCount - 1,
      }),
    },
    {
      label: 'weighted vote count',
      result: VoteResultView.of({
        ...result,
        totalWeightedVoteCount: result.participatedVoteWeight - 1,
      }),
    },
  ])('rejects an inconsistent $label projection', async ({ result }) => {
    const repository = createRepository();
    repository.getResult.mockResolvedValue(result);

    await expect(
      new GetVoteResultHandler(repository).execute(
        GetVoteResultQuery.of({
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
        }),
      ),
    ).rejects.toBeInstanceOf(VoteStatisticsInconsistentError);
  });

  it('rejects turnout when group vote weights are inconsistent', async () => {
    const repository = createRepository();
    repository.getTurnout.mockResolvedValue(
      VoteTurnoutView.of({
        ...turnout,
        groupVoteWeightConsistent: false,
      }),
    );

    await expect(
      new GetVoteTurnoutHandler(repository).execute(
        GetVoteTurnoutQuery.of({
          voteId: 'vote-1',
          voteDetailId: 'vote-detail-1',
        }),
      ),
    ).rejects.toBeInstanceOf(VoteStatisticsInconsistentError);
  });
});

type MockVoteStatisticsReadRepository = {
  [K in keyof VoteStatisticsReadRepositoryPort]: jest.MockedFunction<
    VoteStatisticsReadRepositoryPort[K]
  >;
};

function createRepository(): MockVoteStatisticsReadRepository {
  return {
    getTurnout: jest.fn(),
    getResult: jest.fn(),
  };
}
