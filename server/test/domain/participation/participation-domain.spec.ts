import { CandidateAggregate } from '../../../src/domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../../src/domain/candidate/type/candidate-status.type';
import { ElectionCommissionAggregate } from '../../../src/domain/election-commission/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../src/domain/election-commission/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../src/domain/election-commission/type/election-commission-member-role.type';
import { ElectorAggregate } from '../../../src/domain/elector/elector.aggregate';
import { ElectorStatus } from '../../../src/domain/elector/type/elector-status.type';
import { FieldVotingSessionAggregate } from '../../../src/domain/field-voting/field-voting-session.aggregate';
import { DomainError } from '../../../src/domain/shared/domain-error';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../src/domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../src/domain/vote/type/vote-status.type';
import { VotingChannel } from '../../../src/domain/vote/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../src/domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../src/domain/vote/vo/vote-policy.vo';
import { VoteAggregate } from '../../../src/domain/vote/vote.aggregate';
import { ParticipationAggregate } from '../../../src/domain/participation/participation.aggregate';
import {
  ParticipationCanceled,
  ParticipationCast,
} from '../../../src/domain/participation/participation.events';
import { ParticipationEligibilityPolicy } from '../../../src/domain/participation/participation-eligibility.policy';
import { ParticipationStatus } from '../../../src/domain/participation/type/participation-status.type';

describe('participation domain', () => {
  const publicShareGroupPolicy = VotePolicy.of({
    privacyMode: PrivacyMode.Public,
    participationUnit: ParticipationUnit.Group,
    resultStorageMode: ResultStorageMode.Database,
    voteWeightMode: VoteWeightMode.Share,
  });
  const secretEqualIndividualPolicy = VotePolicy.of({
    privacyMode: PrivacyMode.Secret,
    participationUnit: ParticipationUnit.Individual,
    resultStorageMode: ResultStorageMode.Database,
    voteWeightMode: VoteWeightMode.Equal,
  });

  function createElector(
    overrides: Partial<Parameters<typeof ElectorAggregate.create>[0]> = {},
  ): ElectorAggregate {
    return ElectorAggregate.create({
      id: 'elector-1',
      voteId: 'vote-1',
      identifier: 'member-1',
      groupKey: 'household-1',
      voteWeight: 3.5,
      status: ElectorStatus.Eligible,
      ...overrides,
    });
  }

  function createCandidate(): CandidateAggregate {
    return CandidateAggregate.create({
      id: 'candidate-1',
      voteDetailId: 'detail-1',
      candidateNo: 1,
      name: 'Kim',
      status: CandidateStatus.Active,
    });
  }

  function createOpenFieldVotingSessionFixture(
    id = 'session-1',
  ): FieldVotingSessionAggregate {
    const session = FieldVotingSessionAggregate.schedule({
      id,
      commission: ElectionCommissionAggregate.create({
        id: 'commission-1',
        name: 'Main Commission',
        createdAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
      vote: VoteAggregate.create({
        id: 'vote-1',
        commissionId: 'commission-1',
        title: 'Hybrid vote',
        votingChannels: [VotingChannel.Onsite],
        defaultPolicy: secretEqualIndividualPolicy,
        identityVerificationPolicy: IdentityVerificationPolicy.of({
          required: false,
        }),
        status: VoteStatus.Draft,
      }),
      channel: VotingChannel.Onsite,
      title: 'Lobby voting desk',
      locationName: 'Main Lobby',
      address: 'Seoul Office',
      managers: [
        ElectionCommissionMemberAggregate.create({
          id: 'member-1',
          commissionId: 'commission-1',
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

  it('does not persist selected candidate id for secret participation', () => {
    const participation = ParticipationAggregate.cast({
      id: 'participation-1',
      voteDetailId: 'detail-1',
      elector: createElector(),
      selectedCandidateId: createCandidate().id,
      effectivePolicy: secretEqualIndividualPolicy,
      votingChannel: VotingChannel.Online,
      participatedAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    expect(participation.candidateId).toBeUndefined();
    expect(participation.voteWeight).toBe(1);
  });

  it('requires selected candidate id for public participation', () => {
    expect(() =>
      ParticipationAggregate.cast({
        id: 'participation-2',
        voteDetailId: 'detail-1',
        elector: createElector(),
        effectivePolicy: publicShareGroupPolicy,
        votingChannel: VotingChannel.Online,
        participatedAt: new Date('2026-08-09T00:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('uses elector vote weight for share voting', () => {
    const participation = ParticipationAggregate.cast({
      id: 'participation-3',
      voteDetailId: 'detail-1',
      elector: createElector(),
      selectedCandidateId: createCandidate().id,
      effectivePolicy: publicShareGroupPolicy,
      votingChannel: VotingChannel.Online,
      participatedAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    expect(participation.groupKey).toBe('household-1');
    expect(participation.status).toBe(ParticipationStatus.Cast);
    expect(participation.voteWeight).toBe(3.5);
    expect(participation.pullEvents()[0]).toBeInstanceOf(ParticipationCast);
  });

  it('emits class-based event when participation is canceled', () => {
    const participation = ParticipationAggregate.cast({
      id: 'participation-cancel-1',
      voteDetailId: 'detail-1',
      elector: createElector(),
      effectivePolicy: secretEqualIndividualPolicy,
      votingChannel: VotingChannel.Online,
      participatedAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    participation.pullEvents();
    participation.cancel(new Date('2026-08-10T00:00:00.000Z'));

    expect(participation.pullEvents()[0]).toBeInstanceOf(ParticipationCanceled);
  });

  it('requires group key for group participation', () => {
    expect(() =>
      ParticipationAggregate.cast({
        id: 'participation-4',
        voteDetailId: 'detail-1',
        elector: createElector({ groupKey: undefined }),
        selectedCandidateId: createCandidate().id,
        effectivePolicy: publicShareGroupPolicy,
        votingChannel: VotingChannel.Online,
        participatedAt: new Date('2026-08-09T00:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('detects duplicate individual and group participation', () => {
    const policy = new ParticipationEligibilityPolicy();
    const elector = createElector();
    const existingIndividual = [
      ParticipationAggregate.cast({
        id: 'participation-5',
        voteDetailId: 'detail-1',
        elector,
        effectivePolicy: secretEqualIndividualPolicy,
        votingChannel: VotingChannel.Online,
        participatedAt: new Date('2026-08-09T00:00:00.000Z'),
      }),
    ];

    expect(() =>
      policy.assertCanParticipate({
        voteDetailId: 'detail-1',
        elector,
        effectivePolicy: secretEqualIndividualPolicy,
        existingParticipations: existingIndividual,
      }),
    ).toThrow(DomainError);

    expect(() =>
      policy.assertCanParticipate({
        voteDetailId: 'detail-1',
        elector,
        effectivePolicy: publicShareGroupPolicy,
        existingParticipations: [
          ParticipationAggregate.cast({
            id: 'participation-6',
            voteDetailId: 'detail-1',
            elector,
            selectedCandidateId: createCandidate().id,
            effectivePolicy: publicShareGroupPolicy,
            votingChannel: VotingChannel.Online,
            participatedAt: new Date('2026-08-09T00:00:00.000Z'),
          }),
        ],
      }),
    ).toThrow(DomainError);
  });

  it('requires verified identity when identity verification is required', () => {
    const policy = new ParticipationEligibilityPolicy();
    const elector = createElector();

    expect(() =>
      policy.assertCanParticipate({
        voteDetailId: 'detail-1',
        elector,
        effectivePolicy: secretEqualIndividualPolicy,
        existingParticipations: [],
        identityVerificationRequired: true,
      }),
    ).toThrow(DomainError);

    elector.markIdentityVerified();

    expect(() =>
      policy.assertCanParticipate({
        voteDetailId: 'detail-1',
        elector,
        effectivePolicy: secretEqualIndividualPolicy,
        existingParticipations: [],
        identityVerificationRequired: true,
      }),
    ).not.toThrow();
  });

  it('rejects onsite participation without an open field voting session', () => {
    expect(() =>
      ParticipationAggregate.cast({
        id: 'participation-field-1',
        voteDetailId: 'detail-1',
        elector: createElector(),
        effectivePolicy: secretEqualIndividualPolicy,
        votingChannel: VotingChannel.Onsite,
        participatedAt: new Date('2026-08-20T01:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('rejects online participation with a field voting session', () => {
    const session = createOpenFieldVotingSessionFixture();

    expect(() =>
      ParticipationAggregate.cast({
        id: 'participation-field-2',
        voteDetailId: 'detail-1',
        elector: createElector(),
        effectivePolicy: secretEqualIndividualPolicy,
        votingChannel: VotingChannel.Online,
        fieldVotingSession: session,
        participatedAt: new Date('2026-08-20T01:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('keeps secret onsite participation candidate id absent', () => {
    const participation = ParticipationAggregate.cast({
      id: 'participation-field-3',
      voteDetailId: 'detail-1',
      elector: createElector(),
      selectedCandidateId: createCandidate().id,
      effectivePolicy: secretEqualIndividualPolicy,
      votingChannel: VotingChannel.Onsite,
      fieldVotingSession: createOpenFieldVotingSessionFixture(),
      participatedAt: new Date('2026-08-20T01:00:00.000Z'),
    });

    expect(participation.votingChannel).toBe(VotingChannel.Onsite);
    expect(participation.fieldVotingSessionId).toBe('session-1');
    expect(participation.candidateId).toBeUndefined();
  });

  it('keeps duplicate prevention independent of field voting session', () => {
    const policy = new ParticipationEligibilityPolicy();
    const elector = createElector();
    const existing = [
      ParticipationAggregate.cast({
        id: 'participation-field-4',
        voteDetailId: 'detail-1',
        elector,
        effectivePolicy: secretEqualIndividualPolicy,
        votingChannel: VotingChannel.Onsite,
        fieldVotingSession: createOpenFieldVotingSessionFixture('session-1'),
        participatedAt: new Date('2026-08-20T01:00:00.000Z'),
      }),
    ];

    expect(() =>
      policy.assertCanParticipate({
        voteDetailId: 'detail-1',
        elector,
        effectivePolicy: secretEqualIndividualPolicy,
        existingParticipations: existing,
      }),
    ).toThrow(DomainError);
  });
});
