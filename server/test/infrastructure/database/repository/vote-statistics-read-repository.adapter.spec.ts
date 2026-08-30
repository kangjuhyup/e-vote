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
import { VoteStatisticsReadRepositoryAdapter } from '../../../../src/modules/participation/infrastructure/database/repository/query/vote-statistics-read-repository.adapter';

describe('VoteStatisticsReadRepositoryAdapter', () => {
  it('maps share-weighted turnout and rounds rates to two decimal places', async () => {
    const execute = createExecute([
      {
        vote_id: 'vote-1',
        vote_detail_id: 'vote-detail-1',
        participation_unit: ParticipationUnit.Individual,
        vote_weight_mode: VoteWeightMode.Share,
        group_vote_weight_consistent: true,
        eligible_elector_count: '4',
        eligible_voting_unit_count: '4',
        participant_count: '3',
        participated_voting_unit_count: '3',
        eligible_vote_weight: '10.000000',
        participated_vote_weight: '6.000000',
      },
    ]);
    const adapter = new VoteStatisticsReadRepositoryAdapter(
      createEntityManager(execute) as any,
    );

    const turnout = await adapter.getTurnout('vote-1', 'vote-detail-1');

    expect(turnout).toEqual({
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
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining("p.participation_unit = 'GROUP'"),
      ['vote-1', 'vote-detail-1'],
    );
  });

  it('maps candidate and channel aggregates without participant identities', async () => {
    const execute = createExecute([
      {
        vote_id: 'vote-1',
        vote_detail_id: 'vote-detail-1',
        vote_status: VoteStatus.Closed,
        vote_detail_status: VoteDetailStatus.Closed,
        privacy_mode: PrivacyMode.Secret,
        participation_unit: ParticipationUnit.Group,
        vote_weight_mode: VoteWeightMode.Share,
        participant_count: '3',
        participated_vote_weight: '6.000000',
        candidates: [
          {
            candidateId: 'candidate-1',
            candidateNo: 1,
            name: 'Candidate 1',
            status: CandidateStatus.Active,
            voteCount: 2,
            weightedVoteCount: 4.5,
          },
          {
            candidateId: 'candidate-2',
            candidateNo: 2,
            name: 'Candidate 2',
            status: CandidateStatus.Withdrawn,
            voteCount: 1,
            weightedVoteCount: 1.5,
          },
        ],
        voting_channels: [
          {
            channel: VotingChannel.Online,
            participantCount: 2,
            participatedVoteWeight: 5,
          },
          {
            channel: VotingChannel.Onsite,
            participantCount: 1,
            participatedVoteWeight: 1,
          },
        ],
      },
    ]);
    const adapter = new VoteStatisticsReadRepositoryAdapter(
      createEntityManager(execute) as any,
    );

    const result = await adapter.getResult('vote-1', 'vote-detail-1');

    expect(result).toMatchObject({
      voteId: 'vote-1',
      voteDetailId: 'vote-detail-1',
      voteStatus: VoteStatus.Closed,
      voteDetailStatus: VoteDetailStatus.Closed,
      privacyMode: PrivacyMode.Secret,
      participantCount: 3,
      participatedVoteWeight: 6,
      totalVoteCount: 3,
      totalWeightedVoteCount: 6,
      candidates: [
        {
          candidateId: 'candidate-1',
          voteCount: 2,
          voteRate: 66.67,
          weightedVoteCount: 4.5,
          weightedVoteRate: 75,
        },
        {
          candidateId: 'candidate-2',
          voteCount: 1,
          voteRate: 33.33,
          weightedVoteCount: 1.5,
          weightedVoteRate: 25,
        },
      ],
      votingChannels: [
        {
          channel: VotingChannel.Online,
          participantCount: 2,
          participationRate: 66.67,
          participatedVoteWeight: 5,
          weightedParticipationRate: 83.33,
        },
        {
          channel: VotingChannel.Onsite,
          participantCount: 1,
          participationRate: 33.33,
          participatedVoteWeight: 1,
          weightedParticipationRate: 16.67,
        },
      ],
    });
    expect(result).not.toHaveProperty('electors');
    const query = execute.mock.calls[0][0];
    expect(query).toContain('vote_results');
    expect(query).not.toContain('vote_participations.candidate_id');
  });

  it.each(['turnout', 'result'] as const)(
    'returns undefined when the child vote does not exist for %s',
    async (resource) => {
      const execute = createExecute([]);
      const adapter = new VoteStatisticsReadRepositoryAdapter(
        createEntityManager(execute) as any,
      );

      const view =
        resource === 'turnout'
          ? await adapter.getTurnout('vote-1', 'missing')
          : await adapter.getResult('vote-1', 'missing');

      expect(view).toBeUndefined();
    },
  );
});

type Execute = jest.Mock<Promise<unknown[]>, [string, readonly string[]]>;

function createExecute(rows: unknown[]): Execute {
  return jest
    .fn<Promise<unknown[]>, [string, readonly string[]]>()
    .mockResolvedValue(rows);
}

function createEntityManager(execute: Execute): Record<string, unknown> {
  return {
    getConnection: () => ({ execute }),
  };
}
