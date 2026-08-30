import { CandidateStatus } from '../../../../src/shared/domain/voting/type/candidate-status.type';
import { ElectionCommissionMemberRole } from '../../../../src/modules/election-commission/domain/type/election-commission-member-role.type';
import { ElectionCommissionMemberStatus } from '../../../../src/modules/election-commission/domain/type/election-commission-member-status.type';
import { ElectionCommissionStatus } from '../../../../src/modules/election-commission/domain/type/election-commission-status.type';
import { ElectorStatus } from '../../../../src/shared/domain/voting/type/elector-status.type';
import { FieldVotingSessionStatus } from '../../../../src/shared/domain/voting/type/field-voting-session-status.type';
import { ParticipationStatus } from '../../../../src/shared/domain/voting/type/participation-status.type';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/shared/domain/voting/type/vote-policy.type';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../src/shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../src/shared/domain/voting/type/voting-channel.type';
import { CandidateMapper } from '../../../../src/modules/vote/infrastructure/database/mapper/candidate.mapper';
import { ElectionCommissionMemberMapper } from '../../../../src/modules/election-commission/infrastructure/database/mapper/election-commission-member.mapper';
import { ElectionCommissionMapper } from '../../../../src/modules/election-commission/infrastructure/database/mapper/election-commission.mapper';
import { ElectorMapper } from '../../../../src/modules/elector/infrastructure/database/mapper/elector.mapper';
import { FieldParticipationEvidenceMapper } from '../../../../src/modules/field-voting/infrastructure/database/mapper/field-participation-evidence.mapper';
import { FieldVotingSessionMapper } from '../../../../src/modules/field-voting/infrastructure/database/mapper/field-voting-session.mapper';
import { ParticipationMapper } from '../../../../src/modules/participation/infrastructure/database/mapper/participation.mapper';
import { VoteMapper } from '../../../../src/modules/vote/infrastructure/database/mapper/vote.mapper';
import { VoteDetailMapper } from '../../../../src/modules/vote/infrastructure/database/mapper/vote-detail.mapper';
import { PersonalDataCipher } from '../../../../src/platform/security/personal-data-cipher';

describe('database mappers', () => {
  it('maps election commission entity state into domain aggregates', () => {
    const commission = ElectionCommissionMapper.toDomain({
      id: 'commission-1',
      name: 'Main Commission',
      status: ElectionCommissionStatus.Active,
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    });
    const member = ElectionCommissionMemberMapper.toDomain({
      id: 'member-1',
      commission: { id: 'commission-1' },
      name: 'Kim Manager',
      role: ElectionCommissionMemberRole.FieldManager,
      status: ElectionCommissionMemberStatus.Active,
      registeredAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    expect(commission.canRunVote()).toBe(true);
    expect(commission.pullEvents()).toEqual([]);
    expect(member.canManageFieldVoting('commission-1')).toBe(true);
    expect(member.pullEvents()).toEqual([]);
  });

  it('maps vote entity state into a vote aggregate', () => {
    const vote = VoteMapper.toDomain({
      id: 'vote-1',
      commission: { id: 'commission-1' },
      electoralRollSnapshot: { id: 'snapshot-1' },
      title: 'Board election',
      votingChannels: [{ channel: VotingChannel.Online }],
      defaultPrivacyMode: PrivacyMode.Public,
      defaultParticipationUnit: ParticipationUnit.Group,
      defaultResultStorageMode: ResultStorageMode.Blockchain,
      defaultVoteWeightMode: VoteWeightMode.Share,
      identityVerificationRequired: true,
      identityVerificationProvider: 'PASS',
      identityVerificationMethod: 'MOBILE',
      status: VoteStatus.Open,
    });

    expect(vote.status).toBe(VoteStatus.Open);
    expect(vote.commissionId).toBe('commission-1');
    expect(vote.electoralRollSnapshotId).toBe('snapshot-1');
    expect(vote.votingChannels).toEqual([VotingChannel.Online]);
    expect(vote.defaultPolicy).toEqual({
      privacyMode: PrivacyMode.Public,
      participationUnit: ParticipationUnit.Group,
      resultStorageMode: ResultStorageMode.Blockchain,
      voteWeightMode: VoteWeightMode.Share,
    });
    expect(vote.identityVerificationPolicy).toEqual({
      required: true,
      provider: 'PASS',
      method: 'MOBILE',
    });
    expect(vote.pullEvents()).toEqual([]);
  });

  it('maps vote detail entity state into a vote detail aggregate', () => {
    const voteDetail = VoteDetailMapper.toDomain({
      id: 'detail-1',
      vote: { id: 'vote-1' },
      title: 'President',
      type: 'CANDIDATE',
      privacyModeOverride: PrivacyMode.Secret,
      participationUnitOverride: null,
      resultStorageModeOverride: ResultStorageMode.Database,
      voteWeightModeOverride: null,
      sortOrder: 2,
      status: VoteDetailStatus.Closed,
    });

    expect(voteDetail.voteId).toBe('vote-1');
    expect(voteDetail.overrides).toEqual({
      privacyMode: PrivacyMode.Secret,
      resultStorageMode: ResultStorageMode.Database,
    });
    expect(voteDetail.pullEvents()).toEqual([]);
  });

  it('maps elector and candidate entity state into domain aggregates', () => {
    const elector = ElectorMapper.toDomain(
      {
        id: 'elector-1',
        vote: { id: 'vote-1' },
        name: 'Kim Min Su',
        identifier: 'member-1',
        phoneNumber: '010-1234-5678',
        phoneNumberHash: 'hash:010-1234-5678',
        birthDate: '1990-01-31',
        groupKey: 'group-1',
        voteWeight: '2.5',
        status: ElectorStatus.Eligible,
      },
      {
        identityVerified: true,
      },
    );
    const candidate = CandidateMapper.toDomain({
      id: 'candidate-1',
      voteDetail: { id: 'detail-1' },
      candidateNo: 7,
      name: 'Kim',
      status: CandidateStatus.Withdrawn,
    });

    expect(elector.name).toBe('Kim Min Su');
    expect(elector.phoneNumber).toBe('010-1234-5678');
    expect(elector.birthDate).toBe('1990-01-31');
    expect(elector.voteWeight).toBe(2.5);
    expect(elector.isIdentityVerified()).toBe(true);
    expect(candidate.status).toBe(CandidateStatus.Withdrawn);
  });

  it('encrypts elector personal data when mapping to persistence', () => {
    const cipher: PersonalDataCipher = {
      encrypt: (plaintext) => `encrypted:${plaintext}`,
      decrypt: (ciphertext) => ciphertext.replace('encrypted:', ''),
      hash: (plaintext) => `hash:${plaintext}`,
    };
    const elector = ElectorMapper.toDomain({
      id: 'elector-1',
      vote: { id: 'vote-1' },
      name: 'Kim Min Su',
      identifier: 'member-1',
      phoneNumber: '010-1234-5678',
      phoneNumberHash: 'hash:010-1234-5678',
      birthDate: '1990-01-31',
      groupKey: 'group-1',
      voteWeight: '2.5',
      status: ElectorStatus.Eligible,
    });

    const persistence = ElectorMapper.toPersistence(elector, {
      personalDataCipher: cipher,
      now: new Date('2026-08-13T00:00:00.000Z'),
    });

    expect(persistence).toMatchObject({
      id: 'elector-1',
      vote: { id: 'vote-1' },
      name: 'encrypted:Kim Min Su',
      identifier: 'member-1',
      phoneNumber: 'encrypted:010-1234-5678',
      phoneNumberHash: 'hash:010-1234-5678',
      birthDate: 'encrypted:1990-01-31',
      groupKey: 'group-1',
      voteWeight: 2.5,
      status: ElectorStatus.Eligible,
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
      updatedAt: new Date('2026-08-13T00:00:00.000Z'),
    });
  });

  it('maps participation entity state without leaking secret vote candidate ids', () => {
    const participation = ParticipationMapper.toDomain({
      id: 'participation-1',
      voteDetail: { id: 'detail-1' },
      elector: { id: 'elector-1' },
      candidate: null,
      groupKey: 'group-1',
      voteWeight: '3.5',
      votingChannel: VotingChannel.Onsite,
      fieldVotingSession: { id: 'session-1' },
      participatedAt: new Date('2026-08-10T00:00:00.000Z'),
      status: ParticipationStatus.Cast,
    });

    expect(participation.candidateId).toBeUndefined();
    expect(participation.voteWeight).toBe(3.5);
    expect(participation.votingChannel).toBe(VotingChannel.Onsite);
    expect(participation.fieldVotingSessionId).toBe('session-1');
    expect(participation.pullEvents()).toEqual([]);
  });

  it('maps field voting session and evidence entity state into domain aggregates', () => {
    const session = FieldVotingSessionMapper.toDomain({
      id: 'session-1',
      commission: { id: 'commission-1' },
      vote: { id: 'vote-1' },
      channel: VotingChannel.Onsite,
      title: 'Lobby voting desk',
      locationName: 'Main Lobby',
      address: 'Seoul Office',
      managerLinks: [{ commissionMember: { id: 'member-1' } }],
      startsAt: new Date('2026-08-20T00:00:00.000Z'),
      endsAt: new Date('2026-08-20T09:00:00.000Z'),
      status: FieldVotingSessionStatus.Open,
    });
    const evidence = FieldParticipationEvidenceMapper.toDomain({
      id: 'evidence-1',
      participation: { id: 'participation-1' },
      fieldVotingSession: { id: 'session-1' },
      verifiedByCommissionMember: { id: 'member-1' },
      evidenceFile: { id: 'file-1' },
      verificationNote: 'signature checked',
      verifiedAt: new Date('2026-08-20T01:10:00.000Z'),
    });

    expect(session).toMatchObject({
      id: 'session-1',
      commissionId: 'commission-1',
      voteId: 'vote-1',
      channel: VotingChannel.Onsite,
      managerIds: ['member-1'],
      status: FieldVotingSessionStatus.Open,
    });
    expect(session.pullEvents()).toEqual([]);
    expect(evidence).toMatchObject({
      id: 'evidence-1',
      participationId: 'participation-1',
      fieldVotingSessionId: 'session-1',
      verifiedByCommissionMemberId: 'member-1',
      evidenceFileId: 'file-1',
      verificationNote: 'signature checked',
    });
    expect(evidence.pullEvents()).toEqual([]);
  });
});
