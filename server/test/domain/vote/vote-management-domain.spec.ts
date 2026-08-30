import { CandidateAggregate } from '../../../src/domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../../src/domain/candidate/type/candidate-status.type';
import { ElectorAggregate } from '../../../src/domain/elector/elector.aggregate';
import { ElectorStatus } from '../../../src/domain/elector/type/elector-status.type';
import { DomainError } from '../../../src/domain/shared/domain-error';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/domain/vote/type/vote-policy.type';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../src/domain/vote/type/vote-status.type';
import { VotingChannel } from '../../../src/domain/vote/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../src/domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../src/domain/vote/vo/vote-policy.vo';
import { VoteDetailAggregate } from '../../../src/domain/vote/vote-detail.aggregate';
import { VoteAggregate } from '../../../src/domain/vote/vote.aggregate';

describe('vote management domain behavior', () => {
  it('updates draft vote settings and locks settings after opening', () => {
    const vote = createVote();
    vote.updateSettings({
      title: ' Updated ',
      votingChannels: [VotingChannel.Online],
      defaultPolicy: policy(),
      identityVerificationPolicy: IdentityVerificationPolicy.of({
        required: false,
      }),
    });
    expect(vote.title).toBe('Updated');
    vote.open(new Date());
    expect(() =>
      vote.updateSettings({
        title: 'No',
        votingChannels: [VotingChannel.Online],
        defaultPolicy: policy(),
        identityVerificationPolicy: IdentityVerificationPolicy.of({
          required: false,
        }),
      }),
    ).toThrow(DomainError);
  });

  it('updates and cancels only draft child votes', () => {
    const detail = createDetail();
    detail.updateSettings({
      title: 'Updated detail',
      type: 'YES_NO',
      sortOrder: 2,
    });
    expect(detail).toMatchObject({ title: 'Updated detail', sortOrder: 2 });
    detail.cancel();
    expect(detail.status).toBe(VoteDetailStatus.Canceled);
  });

  it('updates then withdraws candidates and updates then blocks electors', () => {
    const candidate = CandidateAggregate.create({
      id: 'candidate-1',
      voteDetailId: 'detail-1',
      candidateNo: 1,
      name: 'A',
    });
    candidate.update({ candidateNo: 2, name: 'B' });
    candidate.withdraw();
    expect(candidate).toMatchObject({
      candidateNo: 2,
      name: 'B',
      status: CandidateStatus.Withdrawn,
    });

    const elector = ElectorAggregate.create({
      id: 'elector-1',
      voteId: 'vote-1',
      name: 'Kim',
      identifier: 'member-1',
    });
    elector.update({
      name: 'Kim',
      identifier: 'member-2',
      groupKey: 'group-1',
      voteWeight: 2,
    });
    elector.block();
    expect(elector).toMatchObject({
      identifier: 'member-2',
      voteWeight: 2,
      status: ElectorStatus.Blocked,
    });
  });
});

function policy() {
  return VotePolicy.of({
    privacyMode: PrivacyMode.Secret,
    participationUnit: ParticipationUnit.Individual,
    resultStorageMode: ResultStorageMode.Database,
    voteWeightMode: VoteWeightMode.Equal,
  });
}
function createVote() {
  return VoteAggregate.create({
    id: 'vote-1',
    commissionId: 'commission-1',
    title: 'Vote',
    votingChannels: [VotingChannel.Online],
    defaultPolicy: policy(),
    identityVerificationPolicy: IdentityVerificationPolicy.of({
      required: false,
    }),
    status: VoteStatus.Draft,
  });
}
function createDetail() {
  return VoteDetailAggregate.create({
    id: 'detail-1',
    voteId: 'vote-1',
    title: 'Detail',
    type: 'CANDIDATE',
    sortOrder: 0,
    status: VoteDetailStatus.Draft,
  });
}
