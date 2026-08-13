import { CandidateStatus } from '../../../src/domain/candidate/type/candidate-status.type';
import { ElectionCommissionMemberRole } from '../../../src/domain/election-commission/type/election-commission-member-role.type';
import { ElectionCommissionMemberStatus } from '../../../src/domain/election-commission/type/election-commission-member-status.type';
import { ElectionCommissionStatus } from '../../../src/domain/election-commission/type/election-commission-status.type';
import { ElectorStatus } from '../../../src/domain/elector/type/elector-status.type';
import { FieldVotingSessionStatus } from '../../../src/domain/field-voting/type/field-voting-session-status.type';
import { ParticipationStatus } from '../../../src/domain/participation/type/participation-status.type';
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

describe('domain type constants', () => {
  it('exposes status and policy values as runtime constants', () => {
    expect(Object.values(PrivacyMode)).toEqual(['SECRET', 'PUBLIC']);
    expect(Object.values(ParticipationUnit)).toEqual(['INDIVIDUAL', 'GROUP']);
    expect(Object.values(ResultStorageMode)).toEqual([
      'DATABASE',
      'BLOCKCHAIN',
    ]);
    expect(Object.values(VoteWeightMode)).toEqual(['EQUAL', 'SHARE']);
    expect(Object.values(VoteStatus)).toEqual([
      'DRAFT',
      'OPEN',
      'CLOSED',
      'CANCELED',
    ]);
    expect(Object.values(VoteDetailStatus)).toEqual([
      'DRAFT',
      'OPEN',
      'CLOSED',
      'CANCELED',
    ]);
    expect(Object.values(ElectorStatus)).toEqual(['ELIGIBLE', 'BLOCKED']);
    expect(Object.values(CandidateStatus)).toEqual(['ACTIVE', 'WITHDRAWN']);
    expect(Object.values(ParticipationStatus)).toEqual(['CAST', 'CANCELED']);
    expect(Object.values(ElectionCommissionStatus)).toEqual([
      'ACTIVE',
      'SUSPENDED',
    ]);
    expect(Object.values(ElectionCommissionMemberRole)).toEqual([
      'ADMIN',
      'FIELD_MANAGER',
    ]);
    expect(Object.values(ElectionCommissionMemberStatus)).toEqual([
      'ACTIVE',
      'INACTIVE',
    ]);
    expect(Object.values(VotingChannel)).toEqual([
      'ONLINE',
      'ONSITE',
      'VISIT',
    ]);
    expect(Object.values(FieldVotingSessionStatus)).toEqual([
      'SCHEDULED',
      'OPEN',
      'CLOSED',
      'CANCELED',
    ]);
  });
});
