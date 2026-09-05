import { CandidateStatus } from '../../../src/shared/domain/voting/type/candidate-status.type';
import { ElectionCommissionMemberRole } from '../../../src/modules/election-commission/domain/type/election-commission-member-role.type';
import { ElectionCommissionMemberStatus } from '../../../src/modules/election-commission/domain/type/election-commission-member-status.type';
import { ElectionCommissionStatus } from '../../../src/modules/election-commission/domain/type/election-commission-status.type';
import { ElectorStatus } from '../../../src/shared/domain/voting/type/elector-status.type';
import { FieldVotingSessionStatus } from '../../../src/shared/domain/voting/type/field-voting-session-status.type';
import { ParticipationStatus } from '../../../src/shared/domain/voting/type/participation-status.type';
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
      'FINALIZED',
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
    expect(Object.values(VotingChannel)).toEqual(['ONLINE', 'ONSITE', 'VISIT']);
    expect(Object.values(FieldVotingSessionStatus)).toEqual([
      'SCHEDULED',
      'OPEN',
      'CLOSED',
      'CANCELED',
    ]);
  });
});
