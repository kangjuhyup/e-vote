import { ElectionCommissionAggregate } from '../../../src/domain/election-commission/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../src/domain/election-commission/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../src/domain/election-commission/type/election-commission-member-role.type';
import { FieldParticipationEvidenceRecorded } from '../../../src/domain/field-voting/field-voting.events';
import { FieldParticipationEvidenceAggregate } from '../../../src/domain/field-voting/field-participation-evidence.aggregate';
import { FieldVotingSessionAggregate } from '../../../src/domain/field-voting/field-voting-session.aggregate';
import { ParticipationAggregate } from '../../../src/domain/participation/participation.aggregate';
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
import { ElectorAggregate } from '../../../src/domain/elector/elector.aggregate';
import { ElectorStatus } from '../../../src/domain/elector/type/elector-status.type';

const secretPolicy = VotePolicy.of({
  privacyMode: PrivacyMode.Secret,
  participationUnit: ParticipationUnit.Individual,
  resultStorageMode: ResultStorageMode.Database,
  voteWeightMode: VoteWeightMode.Equal,
});

function createManagerFixture(): ElectionCommissionMemberAggregate {
  return ElectionCommissionMemberAggregate.create({
    id: 'member-1',
    commissionId: 'commission-1',
    name: 'Kim Manager',
    role: ElectionCommissionMemberRole.FieldManager,
    registeredAt: new Date('2026-08-13T00:00:00.000Z'),
  });
}

function createOpenFieldVotingSessionFixture(): FieldVotingSessionAggregate {
  const session = FieldVotingSessionAggregate.schedule({
    id: 'session-1',
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
      defaultPolicy: secretPolicy,
      identityVerificationPolicy: IdentityVerificationPolicy.of({
        required: false,
      }),
      status: VoteStatus.Draft,
    }),
    channel: VotingChannel.Onsite,
    title: 'Lobby voting desk',
    locationName: 'Main Lobby',
    address: 'Seoul Office',
    managers: [createManagerFixture()],
    startsAt: new Date('2026-08-20T00:00:00.000Z'),
    endsAt: new Date('2026-08-20T09:00:00.000Z'),
    scheduledAt: new Date('2026-08-13T00:00:00.000Z'),
  });
  session.open(new Date('2026-08-20T00:00:00.000Z'));

  return session;
}

function createElectorFixture(): ElectorAggregate {
  return ElectorAggregate.create({
    id: 'elector-1',
    voteId: 'vote-1',
    identifier: 'member-1',
    status: ElectorStatus.Eligible,
  });
}

function createFieldParticipationFixture(
  session = createOpenFieldVotingSessionFixture(),
): ParticipationAggregate {
  return ParticipationAggregate.cast({
    id: 'participation-1',
    voteDetailId: 'detail-1',
    elector: createElectorFixture(),
    effectivePolicy: secretPolicy,
    votingChannel: VotingChannel.Onsite,
    fieldVotingSession: session,
    participatedAt: new Date('2026-08-20T01:00:00.000Z'),
  });
}

function createOnlineParticipationFixture(): ParticipationAggregate {
  return ParticipationAggregate.cast({
    id: 'participation-online',
    voteDetailId: 'detail-1',
    elector: createElectorFixture(),
    effectivePolicy: secretPolicy,
    votingChannel: VotingChannel.Online,
    participatedAt: new Date('2026-08-20T01:00:00.000Z'),
  });
}

describe('field participation evidence domain', () => {
  it('records evidence for field participation verified by an assigned manager', () => {
    const session = createOpenFieldVotingSessionFixture();
    const participation = createFieldParticipationFixture(session);
    const manager = createManagerFixture();

    const evidence = FieldParticipationEvidenceAggregate.record({
      id: 'evidence-1',
      participation,
      fieldVotingSession: session,
      verifiedBy: manager,
      evidenceFileId: 'file-1',
      verificationNote: 'signature checked',
      verifiedAt: new Date('2026-08-20T01:10:00.000Z'),
    });

    expect(evidence).toMatchObject({
      id: 'evidence-1',
      participationId: 'participation-1',
      fieldVotingSessionId: 'session-1',
      verifiedByCommissionMemberId: 'member-1',
      evidenceFileId: 'file-1',
      verificationNote: 'signature checked',
    });
    expect(evidence.pullEvents()[0]).toBeInstanceOf(
      FieldParticipationEvidenceRecorded,
    );
  });

  it('rejects evidence for online participation', () => {
    expect(() =>
      FieldParticipationEvidenceAggregate.record({
        id: 'evidence-online',
        participation: createOnlineParticipationFixture(),
        fieldVotingSession: createOpenFieldVotingSessionFixture(),
        verifiedBy: createManagerFixture(),
        verifiedAt: new Date('2026-08-20T01:10:00.000Z'),
      }),
    ).toThrow(DomainError);
  });
});
