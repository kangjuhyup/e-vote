import { TEST_USER_PRINCIPAL } from '../../user-principal.fixture';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GetVoteResultHandler } from '../../../../src/modules/participation/application/query/handler/get-vote-result.handler';
import { GetVoteResultQuery } from '../../../../src/modules/participation/application/query/dto/request/get-vote-result.query';
import { GetVoteTurnoutHandler } from '../../../../src/modules/participation/application/query/handler/get-vote-turnout.handler';
import { GetVoteTurnoutQuery } from '../../../../src/modules/participation/application/query/dto/request/get-vote-turnout.query';
import {
  CandidateVoteResultView,
  VoteResultView,
  VotingChannelResultView,
} from '../../../../src/modules/participation/application/query/dto/response/vote-result.view';
import {
  VoteResultUnavailableError,
  VoteStatisticsInconsistentError,
  VoteStatisticsNotFoundError,
} from '../../../../src/modules/participation/application/query/vote-statistics.error';
import { VoteTurnoutView } from '../../../../src/modules/participation/application/query/dto/response/vote-turnout.view';
import { CandidateStatus } from '../../../../src/shared/domain/voting/type/candidate-status.type';
import {
  ParticipationUnit,
  PrivacyMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VoteStatisticsController } from '../../../../src/modules/participation/presentation/vote-statistics/vote-statistics.controller';

describe('VoteStatisticsController', () => {
  const getTurnoutExecute = jest.fn<
    ReturnType<GetVoteTurnoutHandler['execute']>,
    [GetVoteTurnoutQuery]
  >();
  const getResultExecute = jest.fn<
    ReturnType<GetVoteResultHandler['execute']>,
    [GetVoteResultQuery]
  >();
  const getTurnoutHandler = {
    execute: getTurnoutExecute,
  } as unknown as jest.Mocked<GetVoteTurnoutHandler>;
  const getResultHandler = {
    execute: getResultExecute,
  } as unknown as jest.Mocked<GetVoteResultHandler>;
  let controller: VoteStatisticsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VoteStatisticsController(
      getTurnoutHandler,
      getResultHandler,
    );
  });

  it('maps GET turnout to the query handler', async () => {
    getTurnoutExecute.mockResolvedValue(createTurnoutView());

    const response = await controller.getTurnout(TEST_USER_PRINCIPAL, {
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
    });

    expect(response).toEqual({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
      participationUnit: ParticipationUnit.Individual,
      voteWeightMode: VoteWeightMode.Share,
      eligibleElectorCount: 4,
      eligibleVotingUnitCount: 4,
      participantCount: 3,
      participatedVotingUnitCount: 3,
      turnoutRate: 75,
      eligibleVoteWeight: 10,
      participatedVoteWeight: 6,
      weightedTurnoutRate: 60,
    });
    expect(getTurnoutExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
    });
  });

  it('maps GET results to aggregate candidate and channel responses', async () => {
    getResultExecute.mockResolvedValue(createResultView());

    const response = await controller.getResult(TEST_USER_PRINCIPAL, {
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
    });

    expect(response).toMatchObject({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
      privacyMode: PrivacyMode.Secret,
      participantCount: 3,
      participatedVoteWeight: 6,
      totalVoteCount: 3,
      totalWeightedVoteCount: 6,
      candidates: [
        {
          candidateId: 'candidate-1',
          voteRate: 66.67,
          weightedVoteRate: 75,
        },
      ],
      votingChannels: [
        {
          channel: VotingChannel.Online,
          participantCount: 2,
          participationRate: 66.67,
        },
      ],
    });
    expect(response).not.toHaveProperty('electors');
    expect(getResultExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
    });
  });

  it.each(['turnout', 'result'] as const)(
    'maps missing vote statistics to 404 for %s',
    async (resource) => {
      getTurnoutExecute.mockRejectedValue(new VoteStatisticsNotFoundError());
      getResultExecute.mockRejectedValue(new VoteStatisticsNotFoundError());

      const action =
        resource === 'turnout'
          ? controller.getTurnout(TEST_USER_PRINCIPAL, {
              voteId: 'vote-1',
              voteDetailId: 'missing',
            })
          : controller.getResult(TEST_USER_PRINCIPAL, {
              voteId: 'vote-1',
              voteDetailId: 'missing',
            });

      await expect(action).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('maps unavailable vote results to 409', async () => {
    getResultExecute.mockRejectedValue(new VoteResultUnavailableError());

    await expect(
      controller.getResult(TEST_USER_PRINCIPAL, {
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps inconsistent turnout data to 409', async () => {
    getTurnoutExecute.mockRejectedValue(new VoteStatisticsInconsistentError());

    await expect(
      controller.getTurnout(TEST_USER_PRINCIPAL, {
        voteId: 'vote-1',
        voteDetailId: 'vote-detail-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

function createTurnoutView(): VoteTurnoutView {
  return VoteTurnoutView.of({
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
}

function createResultView(): VoteResultView {
  return VoteResultView.of({
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
}
