import { CandidateAggregate } from '../../src/modules/vote/domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../src/shared/domain/voting/type/candidate-status.type';
import { ElectorAggregate } from '../../src/modules/elector/domain/elector.aggregate';
import { ElectorStatus } from '../../src/shared/domain/voting/type/elector-status.type';
import { ParticipationAggregate } from '../../src/modules/participation/domain/participation.aggregate';
import { ParticipationStatus } from '../../src/shared/domain/voting/type/participation-status.type';
import { VoteAggregate } from '../../src/modules/vote/domain/vote/vote.aggregate';
import { VoteDetailAggregate } from '../../src/modules/vote/domain/vote/vote-detail.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../src/shared/domain/voting/type/vote-policy.type';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../src/shared/domain/voting/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../src/shared/domain/voting/vo/vote-policy.vo';

describe('aggregate reconstitution', () => {
  it('restores vote state without publishing lifecycle events', () => {
    const vote = VoteAggregate.reconstitute({
      id: 'vote-1',
      commissionId: 'commission-1',
      title: 'Board election',
      votingChannels: [VotingChannel.Online, VotingChannel.Onsite],
      defaultPolicy: VotePolicy.of({
        privacyMode: PrivacyMode.Public,
        participationUnit: ParticipationUnit.Group,
        resultStorageMode: ResultStorageMode.Blockchain,
        voteWeightMode: VoteWeightMode.Share,
      }),
      identityVerificationPolicy: IdentityVerificationPolicy.of({
        required: true,
        provider: 'PASS',
        method: 'MOBILE',
      }),
      startedAt: new Date('2026-08-09T00:00:00.000Z'),
      endedAt: new Date('2026-08-10T00:00:00.000Z'),
      status: VoteStatus.Open,
    });

    expect(vote.status).toBe(VoteStatus.Open);
    expect(vote.commissionId).toBe('commission-1');
    expect(vote.votingChannels).toEqual([
      VotingChannel.Online,
      VotingChannel.Onsite,
    ]);
    expect(vote.defaultPolicy).toEqual({
      privacyMode: PrivacyMode.Public,
      participationUnit: ParticipationUnit.Group,
      resultStorageMode: ResultStorageMode.Blockchain,
      voteWeightMode: VoteWeightMode.Share,
    });
    expect(vote.pullEvents()).toEqual([]);
  });

  it('restores participation snapshots without applying cast policy rules again', () => {
    const participation = ParticipationAggregate.reconstitute({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      electorId: 'elector-1',
      groupKey: 'group-1',
      voteWeight: 3.5,
      votingChannel: VotingChannel.Online,
      participatedAt: new Date('2026-08-10T00:00:00.000Z'),
      status: ParticipationStatus.Cast,
    });

    expect(participation.candidateId).toBeUndefined();
    expect(participation.groupKey).toBe('group-1');
    expect(participation.voteWeight).toBe(3.5);
    expect(participation.votingChannel).toBe(VotingChannel.Online);
    expect(participation.pullEvents()).toEqual([]);
  });

  it('restores elector, candidate, and vote detail aggregate state', () => {
    const elector = ElectorAggregate.reconstitute({
      id: 'elector-1',
      voteId: 'vote-1',
      identifier: 'member-1',
      groupKey: 'group-1',
      voteWeight: 2,
      status: ElectorStatus.Blocked,
      identityVerified: true,
    });
    const candidate = CandidateAggregate.reconstitute({
      id: 'candidate-1',
      voteDetailId: 'detail-1',
      candidateNo: 7,
      name: 'Kim',
      status: CandidateStatus.Withdrawn,
    });
    const voteDetail = VoteDetailAggregate.reconstitute({
      id: 'detail-1',
      voteId: 'vote-1',
      title: 'President',
      type: 'CANDIDATE',
      overrides: {
        privacyMode: PrivacyMode.Secret,
      },
      sortOrder: 2,
      status: VoteDetailStatus.Closed,
    });

    expect(elector.isIdentityVerified()).toBe(true);
    expect(elector.status).toBe(ElectorStatus.Blocked);
    expect(candidate.status).toBe(CandidateStatus.Withdrawn);
    expect(voteDetail.status).toBe(VoteDetailStatus.Closed);
    expect(voteDetail.pullEvents()).toEqual([]);
  });
});
