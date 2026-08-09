import { CandidateStatus } from '../../../src/domain/candidate/type/candidate-status.type';
import { ElectorStatus } from '../../../src/domain/elector/type/elector-status.type';
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
  });
});
