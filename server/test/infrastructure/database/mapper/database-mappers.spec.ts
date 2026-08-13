import { CandidateStatus } from '../../../../src/domain/candidate/type/candidate-status.type';
import { ElectorStatus } from '../../../../src/domain/elector/type/elector-status.type';
import { ParticipationStatus } from '../../../../src/domain/participation/type/participation-status.type';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../src/domain/vote/type/vote-policy.type';
import {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../src/domain/vote/type/vote-status.type';
import { CandidateMapper } from '../../../../src/infrastructure/database/mapper/candidate.mapper';
import { ElectorMapper } from '../../../../src/infrastructure/database/mapper/elector.mapper';
import { ParticipationMapper } from '../../../../src/infrastructure/database/mapper/participation.mapper';
import { VoteMapper } from '../../../../src/infrastructure/database/mapper/vote.mapper';
import { VoteDetailMapper } from '../../../../src/infrastructure/database/mapper/vote-detail.mapper';

describe('database mappers', () => {
  it('maps vote entity state into a vote aggregate', () => {
    const vote = VoteMapper.toDomain({
      id: 'vote-1',
      title: 'Board election',
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
        identifier: 'member-1',
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

    expect(elector.voteWeight).toBe(2.5);
    expect(elector.isIdentityVerified()).toBe(true);
    expect(candidate.status).toBe(CandidateStatus.Withdrawn);
  });

  it('maps participation entity state without leaking secret vote candidate ids', () => {
    const participation = ParticipationMapper.toDomain({
      id: 'participation-1',
      voteDetail: { id: 'detail-1' },
      elector: { id: 'elector-1' },
      candidate: null,
      groupKey: 'group-1',
      voteWeight: '3.5',
      participatedAt: new Date('2026-08-10T00:00:00.000Z'),
      status: ParticipationStatus.Cast,
    });

    expect(participation.candidateId).toBeUndefined();
    expect(participation.voteWeight).toBe(3.5);
    expect(participation.pullEvents()).toEqual([]);
  });
});
