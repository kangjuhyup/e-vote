import { CandidateAggregate } from '../../../src/modules/vote/domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../../src/shared/domain/voting/type/candidate-status.type';
import { ElectorAggregate } from '../../../src/modules/elector/domain/elector.aggregate';
import { ElectorStatus } from '../../../src/shared/domain/voting/type/elector-status.type';
import { DomainError } from '../../../src/shared/domain/domain-error';
import { VoteAggregate } from '../../../src/modules/vote/domain/vote/vote.aggregate';
import { VoteDetailAggregate } from '../../../src/modules/vote/domain/vote/vote-detail.aggregate';
import {
  VoteClosed,
  VoteOpened,
} from '../../../src/modules/vote/domain/vote/vote.events';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/shared/domain/voting/type/vote-policy.type';
import { VotePolicy } from '../../../src/shared/domain/voting/vo/vote-policy.vo';
import { IdentityVerificationPolicy } from '../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../src/shared/domain/voting/type/voting-channel.type';

describe('vote domain aggregates', () => {
  it('requires an authenticated creator for newly created votes', () => {
    expect(() =>
      VoteAggregate.create({
        id: 'vote-without-creator',
        createdByUserPrincipalId: '   ',
        commissionId: 'commission-1',
        title: 'Board election',
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
      }),
    ).toThrow('vote creator user principal id must not be empty');
  });

  it('allows legacy persisted votes to be reconstituted without a creator', () => {
    const vote = VoteAggregate.reconstitute({
      id: 'legacy-vote',
      commissionId: 'commission-1',
      title: 'Legacy vote',
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
      status: VoteStatus.Draft,
    });

    expect(vote.createdByUserPrincipalId).toBeUndefined();
    expect(vote.isCreatedBy('user-1')).toBe(false);
  });

  it('calculates effective vote detail policy from parent defaults and overrides', () => {
    const vote = VoteAggregate.create({
      id: 'vote-1',
      createdByUserPrincipalId: 'user-1',
      commissionId: 'commission-1',
      title: 'Board election',
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
      status: VoteStatus.Draft,
    });
    const detail = VoteDetailAggregate.create({
      id: 'detail-1',
      voteId: vote.id,
      title: 'President',
      type: 'CANDIDATE',
      overrides: {
        privacyMode: PrivacyMode.Public,
        participationUnit: ParticipationUnit.Group,
        voteWeightMode: VoteWeightMode.Share,
      },
      sortOrder: 1,
      status: VoteDetailStatus.Draft,
    });

    expect(detail.getEffectivePolicy(vote.defaultPolicy)).toEqual({
      privacyMode: PrivacyMode.Public,
      participationUnit: ParticipationUnit.Group,
      resultStorageMode: ResultStorageMode.Database,
      voteWeightMode: VoteWeightMode.Share,
    });
    expect(detail.getEffectivePolicy(vote.defaultPolicy)).toBeInstanceOf(
      VotePolicy,
    );
    expect(vote.isCreatedBy('user-1')).toBe(true);
    expect(detail.belongsToVote(vote.id)).toBe(true);
  });

  it('validates identity verification policy consistency', () => {
    expect(() =>
      VoteAggregate.create({
        id: 'vote-2',
        createdByUserPrincipalId: 'user-1',
        commissionId: 'commission-1',
        title: 'Invalid',
        votingChannels: [VotingChannel.Online],
        defaultPolicy: VotePolicy.of({
          privacyMode: PrivacyMode.Secret,
          participationUnit: ParticipationUnit.Individual,
          resultStorageMode: ResultStorageMode.Database,
          voteWeightMode: VoteWeightMode.Equal,
        }),
        identityVerificationPolicy: IdentityVerificationPolicy.of({
          required: true,
        }),
        status: VoteStatus.Draft,
      }),
    ).toThrow(DomainError);
  });

  it('emits vote lifecycle events for valid status transitions', () => {
    const vote = VoteAggregate.create({
      id: 'vote-3',
      createdByUserPrincipalId: 'user-1',
      commissionId: 'commission-1',
      title: 'Lifecycle',
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
      status: VoteStatus.Draft,
    });

    vote.lockForBilling('billing-order-1');
    expect(vote.status).toBe(VoteStatus.Draft);
    expect(() =>
      vote.updateSettings({
        title: 'Locked lifecycle',
        votingChannels: [VotingChannel.Online],
        defaultPolicy: vote.defaultPolicy,
        identityVerificationPolicy: vote.identityVerificationPolicy,
      }),
    ).toThrow('billing-locked vote setup cannot be changed');

    vote.finalizePaidBilling({
      billingOrderId: 'billing-order-1',
      finalizedAt: new Date('2026-08-08T00:01:00.000Z'),
    });
    expect(vote.status).toBe(VoteStatus.Finalized);
    vote.open(new Date('2026-08-09T00:00:00.000Z'));
    expect(() =>
      vote.finalizePaidBilling({
        billingOrderId: 'billing-order-1',
        finalizedAt: new Date('2026-08-09T00:01:00.000Z'),
      }),
    ).not.toThrow();
    vote.close(new Date('2026-08-10T00:00:00.000Z'));

    const events = vote.pullEvents();

    expect(vote.status).toBe(VoteStatus.Closed);
    expect(events.map((event) => event.type)).toEqual([
      'VoteOpened',
      'VoteClosed',
    ]);
    expect(events[0]).toBeInstanceOf(VoteOpened);
    expect(events[1]).toBeInstanceOf(VoteClosed);
  });

  it('keeps a paid vote locked until terminal refund and then allows another billing order', () => {
    const vote = VoteAggregate.create({
      id: 'vote-refund-lifecycle',
      createdByUserPrincipalId: 'user-1',
      commissionId: 'commission-1',
      title: 'Refund lifecycle',
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

    vote.lockForBilling('billing-order-1');
    vote.finalizePaidBilling({
      billingOrderId: 'billing-order-1',
      finalizedAt: new Date('2026-09-05T00:00:00.000Z'),
    });
    vote.assertBillingCancellationAllowed('billing-order-1');

    expect(vote.status).toBe(VoteStatus.Finalized);
    expect(() =>
      vote.updateSettings({
        title: 'Still locked',
        votingChannels: [VotingChannel.Online],
        defaultPolicy: vote.defaultPolicy,
        identityVerificationPolicy: vote.identityVerificationPolicy,
      }),
    ).toThrow('only draft votes can be updated');

    vote.releaseBilling('billing-order-1');
    expect(vote).toMatchObject({
      status: VoteStatus.Draft,
      billingOrderId: undefined,
      finalizedAt: undefined,
    });

    vote.updateSettings({
      title: 'Editable again',
      votingChannels: [VotingChannel.Online],
      defaultPolicy: vote.defaultPolicy,
      identityVerificationPolicy: vote.identityVerificationPolicy,
    });
    vote.lockForBilling('billing-order-2');
    expect(vote.billingOrderId).toBe('billing-order-2');
  });

  it('creates elector and candidate aggregates with validated values', () => {
    const elector = ElectorAggregate.create({
      id: 'elector-1',
      voteId: 'vote-1',
      identifier: 'member-1',
      groupKey: 'household-1',
      voteWeight: 2.5,
      status: ElectorStatus.Eligible,
    });
    const candidate = CandidateAggregate.create({
      id: 'candidate-1',
      voteDetailId: 'detail-1',
      candidateNo: 1,
      name: 'Kim',
      status: CandidateStatus.Active,
    });

    expect(elector.voteWeight).toBe(2.5);
    expect(candidate.status).toBe(CandidateStatus.Active);
    expect(candidate.belongsToVoteDetail('detail-1')).toBe(true);
    expect(candidate.isSelectableForVoteDetail('detail-1')).toBe(true);
  });

  it('requires at least one voting channel', () => {
    expect(() =>
      VoteAggregate.create({
        id: 'vote-channels-1',
        createdByUserPrincipalId: 'user-1',
        commissionId: 'commission-1',
        title: 'Field vote',
        votingChannels: [],
        defaultPolicy: VotePolicy.of({
          privacyMode: PrivacyMode.Secret,
          participationUnit: ParticipationUnit.Individual,
          resultStorageMode: ResultStorageMode.Database,
          voteWeightMode: VoteWeightMode.Equal,
        }),
        identityVerificationPolicy: IdentityVerificationPolicy.of({
          required: false,
        }),
        status: VoteStatus.Draft,
      }),
    ).toThrow(DomainError);
  });

  it('checks parent-vote-level voting channel allowance', () => {
    const vote = VoteAggregate.create({
      id: 'vote-channels-2',
      createdByUserPrincipalId: 'user-1',
      commissionId: 'commission-1',
      title: 'Hybrid vote',
      votingChannels: [VotingChannel.Online, VotingChannel.Onsite],
      defaultPolicy: VotePolicy.of({
        privacyMode: PrivacyMode.Secret,
        participationUnit: ParticipationUnit.Individual,
        resultStorageMode: ResultStorageMode.Database,
        voteWeightMode: VoteWeightMode.Equal,
      }),
      identityVerificationPolicy: IdentityVerificationPolicy.of({
        required: false,
      }),
      status: VoteStatus.Draft,
    });

    expect(vote.commissionId).toBe('commission-1');
    expect(vote.votingChannels).toEqual([
      VotingChannel.Online,
      VotingChannel.Onsite,
    ]);
    expect(vote.allowsVotingChannel(VotingChannel.Onsite)).toBe(true);
    expect(vote.allowsVotingChannel(VotingChannel.Visit)).toBe(false);
  });
});
