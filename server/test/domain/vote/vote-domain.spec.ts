import { CandidateAggregate } from '../../../src/domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../../src/domain/candidate/type/candidate-status.type';
import { ElectorAggregate } from '../../../src/domain/elector/elector.aggregate';
import { ElectorStatus } from '../../../src/domain/elector/type/elector-status.type';
import { DomainError } from '../../../src/domain/shared/domain-error';
import { VoteAggregate } from '../../../src/domain/vote/vote.aggregate';
import { VoteDetailAggregate } from '../../../src/domain/vote/vote-detail.aggregate';
import {
  VoteClosed,
  VoteOpened,
} from '../../../src/domain/vote/vote.events';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/domain/vote/type/vote-policy.type';
import { VotePolicy } from '../../../src/domain/vote/vo/vote-policy.vo';
import { IdentityVerificationPolicy } from '../../../src/domain/vote/vo/identity-verification-policy.vo';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../src/domain/vote/type/vote-status.type';

describe('vote domain aggregates', () => {
  it('calculates effective vote detail policy from parent defaults and overrides', () => {
    const vote = VoteAggregate.create({
      id: 'vote-1',
      title: 'Board election',
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
  });

  it('validates identity verification policy consistency', () => {
    expect(() =>
      VoteAggregate.create({
        id: 'vote-2',
        title: 'Invalid',
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
      title: 'Lifecycle',
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

    vote.open(new Date('2026-08-09T00:00:00.000Z'));
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
  });
});
