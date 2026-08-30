import { RecordFieldParticipationEvidenceCommand } from '../../../../src/modules/field-voting/application/command/dto/request/record-field-participation-evidence.command';
import { RecordFieldParticipationEvidenceHandler } from '../../../../src/modules/field-voting/application/command/handler/record-field-participation-evidence.handler';
import { ElectionCommissionMemberRepositoryPort } from '../../../../src/modules/election-commission/application/port/persistence/command/election-commission-member-repository.port';
import { FieldParticipationEvidenceRepositoryPort } from '../../../../src/modules/field-voting/application/port/persistence/command/field-participation-evidence-repository.port';
import { FieldVotingSessionRepositoryPort } from '../../../../src/modules/field-voting/application/port/persistence/command/field-voting-session-repository.port';
import { FileRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/file-repository.port';
import { ParticipationRepositoryPort } from '../../../../src/modules/participation/application/port/persistence/command/participation-repository.port';
import { CastParticipationTransactionResources } from '../../../../src/modules/participation/application/port/persistence/command/participation-repository.port';
import { ElectionCommissionAggregate } from '../../../../src/modules/election-commission/domain/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../../src/modules/election-commission/domain/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../../src/modules/election-commission/domain/type/election-commission-member-role.type';
import { ElectorAggregate } from '../../../../src/modules/elector/domain/elector.aggregate';
import { ElectorStatus } from '../../../../src/shared/domain/voting/type/elector-status.type';
import { FieldParticipationEvidenceAggregate } from '../../../../src/modules/field-voting/domain/field-participation-evidence.aggregate';
import { FieldVotingSessionAggregate } from '../../../../src/modules/field-voting/domain/field-voting-session.aggregate';
import { ParticipationAggregate } from '../../../../src/modules/participation/domain/participation.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import { VoteStatus } from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../../src/shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../src/shared/domain/voting/vo/vote-policy.vo';
import { VoteAggregate } from '../../../../src/modules/vote/domain/vote/vote.aggregate';

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
    userPrincipalId: 'user-1',
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

function createFieldParticipationFixture(): ParticipationAggregate {
  return ParticipationAggregate.cast({
    id: 'participation-1',
    voteDetailId: 'detail-1',
    elector: ElectorAggregate.create({
      id: 'elector-1',
      voteId: 'vote-1',
      identifier: 'member-1',
      status: ElectorStatus.Eligible,
    }),
    effectivePolicy: secretPolicy,
    votingChannel: VotingChannel.Onsite,
    fieldVotingSession: createOpenFieldVotingSessionFixture(),
    participatedAt: new Date('2026-08-20T01:00:00.000Z'),
  });
}

describe('RecordFieldParticipationEvidenceHandler', () => {
  it('records field evidence without reading raw file or identity data', async () => {
    const save = jest
      .fn<Promise<void>, [FieldParticipationEvidenceAggregate]>()
      .mockResolvedValue(undefined);
    const participationRepository: ParticipationRepositoryPort = {
      nextId: jest.fn().mockReturnValue('participation-unused'),
      runCastTransaction: <T>(
        _resources: CastParticipationTransactionResources,
        work: () => Promise<T>,
      ): Promise<T> => work(),
      findById: jest.fn().mockResolvedValue(createFieldParticipationFixture()),
      findCastByVoteDetailId: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
      saveCastWithResult: jest.fn().mockResolvedValue(undefined),
    };
    const fieldVotingSessionRepository: FieldVotingSessionRepositoryPort = {
      nextId: jest.fn().mockReturnValue('session-unused'),
      findById: jest
        .fn()
        .mockResolvedValue(createOpenFieldVotingSessionFixture()),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const memberRepository: ElectionCommissionMemberRepositoryPort = {
      nextId: jest.fn().mockReturnValue('member-unused'),
      findByIds: jest.fn().mockResolvedValue([createManagerFixture()]),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const fileRepository: FileRepositoryPort = {
      existsById: jest.fn().mockResolvedValue(true),
    };
    const evidenceRepository: FieldParticipationEvidenceRepositoryPort = {
      nextId: jest.fn().mockReturnValue('evidence-1'),
      save,
    };
    const handler = new RecordFieldParticipationEvidenceHandler(
      participationRepository,
      fieldVotingSessionRepository,
      memberRepository,
      fileRepository,
      evidenceRepository,
    );

    const result = await handler.execute(
      RecordFieldParticipationEvidenceCommand.of({
        participationId: 'participation-1',
        fieldVotingSessionId: 'session-1',
        verifiedByCommissionMemberId: 'member-1',
        evidenceFileId: 'file-1',
        verificationNote: 'signature checked',
        verifiedAt: new Date('2026-08-20T01:10:00.000Z'),
      }),
    );

    expect(result).toEqual({
      id: 'evidence-1',
      participationId: 'participation-1',
    });
    expect(save.mock.calls[0][0]).toMatchObject({
      evidenceFileId: 'file-1',
      verificationNote: 'signature checked',
    });
  });
});
