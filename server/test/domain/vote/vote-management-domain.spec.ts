import { CandidateAggregate } from '../../../src/modules/vote/domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../../src/shared/domain/voting/type/candidate-status.type';
import { ElectorAggregate } from '../../../src/modules/elector/domain/elector.aggregate';
import { ElectorStatus } from '../../../src/shared/domain/voting/type/elector-status.type';
import { DomainError } from '../../../src/shared/domain/domain-error';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/shared/domain/voting/type/vote-policy.type';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../src/shared/domain/voting/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../src/shared/domain/voting/vo/vote-policy.vo';
import { VoteDetailAggregate } from '../../../src/modules/vote/domain/vote/vote-detail.aggregate';
import { VoteAggregate } from '../../../src/modules/vote/domain/vote/vote.aggregate';

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
    vote.finalizeForBilling({
      billingOrderId: 'billing-order-1',
      finalizedAt: new Date(),
    });
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

  it('locks setup at billing finalization and only cancels before opening', () => {
    const vote = createVote();
    expect(() => vote.assertElectorsMutable('updated')).not.toThrow();
    vote.finalizeForBilling({
      billingOrderId: 'billing-order-1',
      finalizedAt: new Date('2026-08-31T00:00:00.000Z'),
    });

    expect(() => vote.attachElectoralRollSnapshot('snapshot-1')).toThrow(
      'finalized vote setup cannot be changed',
    );
    expect(() => vote.assertElectorsMutable('updated')).toThrow(
      'finalized vote electors cannot be changed',
    );
    vote.cancelFinalized(new Date('2026-09-01T00:00:00.000Z'));
    expect(vote.status).toBe(VoteStatus.Canceled);
  });

  it('rejects partial or conflicting vote finalization data', () => {
    expect(() =>
      VoteAggregate.reconstitute({
        id: 'vote-1',
        commissionId: 'commission-1',
        title: 'Vote',
        votingChannels: [VotingChannel.Online],
        defaultPolicy: policy(),
        identityVerificationPolicy: IdentityVerificationPolicy.of({
          required: false,
        }),
        billingOrderId: 'billing-order-1',
        status: VoteStatus.Draft,
      }),
    ).toThrow('must be set together');

    const vote = createVote();
    vote.finalizeForBilling({
      billingOrderId: 'billing-order-1',
      finalizedAt: new Date('2026-08-31T00:00:00.000Z'),
    });
    expect(() =>
      vote.finalizeForBilling({
        billingOrderId: 'billing-order-1',
        finalizedAt: new Date('2026-08-31T00:00:01.000Z'),
      }),
    ).toThrow('different billing data');
  });

  it('updates and cancels only draft child votes', () => {
    const detail = createDetail();
    expect(() => detail.assertChildResourcesMutable('updated')).not.toThrow();
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
    createdByUserPrincipalId: 'user-1',
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
