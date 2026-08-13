import { NotFoundException } from '@nestjs/common';
import { CreateVoteHandler } from '../../../../src/application/command/create-vote.handler';
import { CreateVoteCommand } from '../../../../src/application/command/create-vote.command';
import { GetVotePageHandler } from '../../../../src/application/query/get-vote-page.handler';
import { GetVotePageQuery } from '../../../../src/application/query/get-vote-page.query';
import {
  GetVoteHandler,
  VoteNotFoundError,
} from '../../../../src/application/query/get-vote.handler';
import { GetVoteQuery } from '../../../../src/application/query/get-vote.query';
import {
  CandidateView,
  IdentityVerificationPolicyView,
  VoteDetailView,
  VotePageView,
  VotePolicyOverridesView,
  VotePolicyView,
  VoteSummaryView,
  VoteView,
} from '../../../../src/application/query/vote.view';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../../src/domain/vote/type/vote-status.type';
import { VotingChannel } from '../../../../src/domain/vote/type/voting-channel.type';
import { VoteController } from '../../../../src/presentation/route/vote/vote.controller';

describe('VoteController', () => {
  const createVoteExecute = jest.fn<
    ReturnType<CreateVoteHandler['execute']>,
    [CreateVoteCommand]
  >();
  const createVoteHandler = {
    execute: createVoteExecute,
  } as unknown as jest.Mocked<CreateVoteHandler>;
  const getVoteExecute = jest.fn<
    ReturnType<GetVoteHandler['execute']>,
    [GetVoteQuery]
  >();
  const getVoteHandler = {
    execute: getVoteExecute,
  } as unknown as jest.Mocked<GetVoteHandler>;
  const getVotePageExecute = jest.fn<
    ReturnType<GetVotePageHandler['execute']>,
    [GetVotePageQuery]
  >();
  const getVotePageHandler = {
    execute: getVotePageExecute,
  } as unknown as jest.Mocked<GetVotePageHandler>;

  let controller: VoteController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VoteController(
      createVoteHandler,
      getVoteHandler,
      getVotePageHandler,
    );
  });

  it('maps GET /votes to vote page query handler', async () => {
    getVotePageExecute.mockResolvedValue(createVotePageView());

    const response = await controller.getVotePage({
      page: '2',
      pageSize: '10',
    });

    expect(response).toEqual({
      items: [
        {
          id: 'vote-1',
          commissionId: 'commission-1',
          title: 'Board election',
          votingChannels: [VotingChannel.Online],
          defaultPolicy: {
            privacyMode: PrivacyMode.Secret,
            participationUnit: ParticipationUnit.Individual,
            resultStorageMode: ResultStorageMode.Database,
            voteWeightMode: VoteWeightMode.Equal,
          },
          identityVerificationPolicy: {
            required: false,
          },
          status: VoteStatus.Draft,
          startedAt: '2026-08-13T00:00:00.000Z',
          endedAt: '2026-08-14T00:00:00.000Z',
          createdAt: '2026-08-12T00:00:00.000Z',
          updatedAt: '2026-08-12T01:00:00.000Z',
        },
      ],
      page: 2,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
    expect(getVotePageExecute).toHaveBeenCalledTimes(1);
    expect(getVotePageExecute.mock.calls[0][0]).toMatchObject({
      page: 2,
      pageSize: 10,
    });
  });

  it('maps GET /votes/:voteId to vote detail query handler', async () => {
    getVoteExecute.mockResolvedValue(createVoteView());

    const response = await controller.getVote({ voteId: 'vote-1' });

    expect(response).toEqual({
      id: 'vote-1',
      commissionId: 'commission-1',
      title: 'Board election',
      description: 'Annual board election',
      votingChannels: [VotingChannel.Online],
      defaultPolicy: {
        privacyMode: PrivacyMode.Secret,
        participationUnit: ParticipationUnit.Individual,
        resultStorageMode: ResultStorageMode.Database,
        voteWeightMode: VoteWeightMode.Equal,
      },
      identityVerificationPolicy: {
        required: false,
      },
      status: VoteStatus.Draft,
      voteDetails: [
        {
          id: 'vote-detail-1',
          voteId: 'vote-1',
          title: 'President',
          description: '',
          type: 'CANDIDATE',
          overrides: {
            privacyMode: PrivacyMode.Public,
          },
          sortOrder: 0,
          status: VoteStatus.Draft,
          candidates: [
            {
              id: 'candidate-1',
              voteDetailId: 'vote-detail-1',
              candidateNo: 1,
              name: 'Kim',
              description: '',
              status: 'ACTIVE',
              createdAt: '2026-08-12T00:00:00.000Z',
              updatedAt: '2026-08-12T01:00:00.000Z',
            },
          ],
          createdAt: '2026-08-12T00:00:00.000Z',
          updatedAt: '2026-08-12T01:00:00.000Z',
        },
      ],
      startedAt: '2026-08-13T00:00:00.000Z',
      endedAt: '2026-08-14T00:00:00.000Z',
      createdAt: '2026-08-12T00:00:00.000Z',
      updatedAt: '2026-08-12T01:00:00.000Z',
    });
    expect(getVoteExecute).toHaveBeenCalledTimes(1);
    expect(getVoteExecute.mock.calls[0][0]).toMatchObject({
      voteId: 'vote-1',
    });
  });

  it('maps missing vote detail to 404', async () => {
    getVoteExecute.mockRejectedValue(new VoteNotFoundError());

    await expect(
      controller.getVote({ voteId: 'missing-vote' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps POST /votes to create vote command handler', async () => {
    createVoteExecute.mockResolvedValue({
      id: 'vote-1',
      commissionId: 'commission-1',
      status: VoteStatus.Draft,
    });

    const response = await controller.createVote({
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

    expect(response).toEqual({
      id: 'vote-1',
      commissionId: 'commission-1',
      status: VoteStatus.Draft,
    });
    expect(createVoteExecute).toHaveBeenCalledTimes(1);
    expect(createVoteExecute.mock.calls[0][0]).toMatchObject({
      commissionId: 'commission-1',
      title: 'Board election',
      votingChannels: [VotingChannel.Online, VotingChannel.Onsite],
    });
  });
});

function createVoteView(): VoteView {
  return VoteView.of({
    ...createVoteSummaryProps(),
    description: 'Annual board election',
    voteDetails: [
      VoteDetailView.of({
        id: 'vote-detail-1',
        voteId: 'vote-1',
        title: 'President',
        description: '',
        type: 'CANDIDATE',
        overrides: VotePolicyOverridesView.of({
          privacyMode: PrivacyMode.Public,
        }),
        sortOrder: 0,
        status: VoteStatus.Draft,
        candidates: [
          CandidateView.of({
            id: 'candidate-1',
            voteDetailId: 'vote-detail-1',
            candidateNo: 1,
            name: 'Kim',
            description: '',
            status: 'ACTIVE',
            createdAt: new Date('2026-08-12T00:00:00.000Z'),
            updatedAt: new Date('2026-08-12T01:00:00.000Z'),
          }),
        ],
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
        updatedAt: new Date('2026-08-12T01:00:00.000Z'),
      }),
    ],
  });
}

function createVotePageView(): VotePageView {
  return VotePageView.of({
    items: [VoteSummaryView.of(createVoteSummaryProps())],
    page: 2,
    pageSize: 10,
    totalItems: 1,
    totalPages: 1,
  });
}

function createVoteSummaryProps(): Parameters<typeof VoteSummaryView.of>[0] {
  return {
    id: 'vote-1',
    commissionId: 'commission-1',
    title: 'Board election',
    votingChannels: [VotingChannel.Online],
    defaultPolicy: VotePolicyView.of({
      privacyMode: PrivacyMode.Secret,
      participationUnit: ParticipationUnit.Individual,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Equal,
    }),
    identityVerificationPolicy: IdentityVerificationPolicyView.of({
      required: false,
    }),
    status: VoteStatus.Draft,
    startedAt: new Date('2026-08-13T00:00:00.000Z'),
    endedAt: new Date('2026-08-14T00:00:00.000Z'),
    createdAt: new Date('2026-08-12T00:00:00.000Z'),
    updatedAt: new Date('2026-08-12T01:00:00.000Z'),
  };
}
