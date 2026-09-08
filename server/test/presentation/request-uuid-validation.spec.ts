import { BadRequestException, ValidationPipe, type Type } from '@nestjs/common';
import { BillingOrderParam } from '../../src/modules/billing/presentation/billing-order/dto/billing-order-request.dto';
import { CreateVoteUsageBillingOrderBody } from '../../src/modules/billing/presentation/billing-order/dto/create-vote-usage-billing-order-request.dto';
import { GetElectionCommissionParam } from '../../src/modules/election-commission/presentation/election-commission/dto/get-election-commission-request.dto';
import { RegisterElectionCommissionMemberParam } from '../../src/modules/election-commission/presentation/election-commission/dto/register-election-commission-member-request.dto';
import { AuthenticateElectorParam } from '../../src/modules/elector/presentation/elector/dto/authenticate-elector-request.dto';
import { CreateElectorParam } from '../../src/modules/elector/presentation/elector/dto/create-elector-request.dto';
import { GetElectorPageParam } from '../../src/modules/elector/presentation/elector/dto/get-elector-page-request.dto';
import { GetElectorParam } from '../../src/modules/elector/presentation/elector/dto/get-elector-request.dto';
import { ManageElectorParam } from '../../src/modules/elector/presentation/elector/dto/manage-elector-request.dto';
import {
  ElectoralRollMemberParam,
  ElectoralRollParam,
} from '../../src/modules/electoral-roll/presentation/electoral-roll/dto/manage-electoral-roll-member-request.dto';
import { SendFieldVotingSessionSmsParam } from '../../src/modules/field-voting/presentation/field-voting-session-sms/dto/send-field-voting-session-sms-request.dto';
import { ChangeFieldVotingSessionStatusParam } from '../../src/modules/field-voting/presentation/field-voting-session/dto/change-field-voting-session-status-request.dto';
import {
  CreateFieldVotingSessionBody,
  CreateFieldVotingSessionParam,
} from '../../src/modules/field-voting/presentation/field-voting-session/dto/create-field-voting-session-request.dto';
import {
  GetFieldVotingSessionPageParam,
  GetFieldVotingSessionParam,
} from '../../src/modules/field-voting/presentation/field-voting-session/dto/get-field-voting-session-request.dto';
import {
  RecordFieldParticipationEvidenceBody,
  RecordFieldParticipationEvidenceParam,
} from '../../src/modules/field-voting/presentation/participation/dto/record-field-participation-evidence-request.dto';
import { CastParticipationBody } from '../../src/modules/participation/presentation/participation/dto/cast-participation-request.dto';
import { GetVoteStatisticsParam } from '../../src/modules/participation/presentation/vote-statistics/dto/get-vote-statistics-request.dto';
import {
  CandidateAttachmentParam,
  CreateCandidateParam,
} from '../../src/modules/vote/presentation/candidate/dto/create-candidate-request.dto';
import { GetCandidateParam } from '../../src/modules/vote/presentation/candidate/dto/get-candidate-request.dto';
import { ManageCandidateParam } from '../../src/modules/vote/presentation/candidate/dto/manage-candidate-request.dto';
import {
  CreateVoteDetailParam,
  VoteDetailAttachmentParam,
} from '../../src/modules/vote/presentation/vote-detail/dto/create-vote-detail-request.dto';
import { GetVoteDetailParam } from '../../src/modules/vote/presentation/vote-detail/dto/get-vote-detail-request.dto';
import { ManageVoteDetailParam } from '../../src/modules/vote/presentation/vote-detail/dto/manage-vote-detail-request.dto';
import {
  GetSmsDispatchPageParam,
  GetSmsDispatchParam,
} from '../../src/modules/vote/presentation/vote-sms/dto/get-sms-dispatch-request.dto';
import { AttachElectoralRollSnapshotBody } from '../../src/modules/vote/presentation/vote/dto/attach-electoral-roll-snapshot-request.dto';
import {
  CreateVoteBody,
  VoteParam,
} from '../../src/modules/vote/presentation/vote/dto/create-vote-request.dto';
import { GetVoteParam } from '../../src/modules/vote/presentation/vote/dto/get-vote-request.dto';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';
const INVALID_UUID = 'not-a-uuid';

const validRequest: Record<string, unknown> = {
  votingChannel: 'ONLINE',
  billingOrderId: VALID_UUID,
  candidateId: VALID_UUID,
  commissionId: VALID_UUID,
  organizationGroupId: 'organization-1',
  organizationGroupCode: 'ORG-001',
  electoralRollId: VALID_UUID,
  electorId: VALID_UUID,
  evidenceFileId: VALID_UUID,
  fieldVotingSessionId: VALID_UUID,
  managerIds: [VALID_UUID],
  memberId: VALID_UUID,
  participationId: VALID_UUID,
  selectedCandidateId: VALID_UUID,
  smsDispatchId: VALID_UUID,
  verifiedByCommissionMemberId: VALID_UUID,
  voteDetailId: VALID_UUID,
  voteId: VALID_UUID,
};

type UuidValidationCase = readonly [
  name: string,
  metatype: Type<unknown>,
  property: keyof typeof validRequest,
];

const uuidValidationCases: UuidValidationCase[] = [
  ['billing order param', BillingOrderParam, 'billingOrderId'],
  ['billing order body vote', CreateVoteUsageBillingOrderBody, 'voteId'],
  ['commission detail param', GetElectionCommissionParam, 'commissionId'],
  [
    'commission member param',
    RegisterElectionCommissionMemberParam,
    'commissionId',
  ],
  ['elector authentication vote', AuthenticateElectorParam, 'voteId'],
  ['elector authentication elector', AuthenticateElectorParam, 'electorId'],
  ['elector creation vote', CreateElectorParam, 'voteId'],
  ['elector page vote', GetElectorPageParam, 'voteId'],
  ['elector detail vote', GetElectorParam, 'voteId'],
  ['elector detail elector', GetElectorParam, 'electorId'],
  ['elector management vote', ManageElectorParam, 'voteId'],
  ['elector management elector', ManageElectorParam, 'electorId'],
  ['electoral roll param', ElectoralRollParam, 'electoralRollId'],
  ['electoral roll member roll', ElectoralRollMemberParam, 'electoralRollId'],
  ['electoral roll member', ElectoralRollMemberParam, 'memberId'],
  [
    'field session SMS param',
    SendFieldVotingSessionSmsParam,
    'fieldVotingSessionId',
  ],
  [
    'field session status param',
    ChangeFieldVotingSessionStatusParam,
    'fieldVotingSessionId',
  ],
  [
    'field session body commission',
    CreateFieldVotingSessionBody,
    'commissionId',
  ],
  ['field session body managers', CreateFieldVotingSessionBody, 'managerIds'],
  ['field session creation vote', CreateFieldVotingSessionParam, 'voteId'],
  [
    'field session detail param',
    GetFieldVotingSessionParam,
    'fieldVotingSessionId',
  ],
  ['field session page vote', GetFieldVotingSessionPageParam, 'voteId'],
  [
    'field evidence session',
    RecordFieldParticipationEvidenceBody,
    'fieldVotingSessionId',
  ],
  [
    'field evidence verifier',
    RecordFieldParticipationEvidenceBody,
    'verifiedByCommissionMemberId',
  ],
  [
    'field evidence file',
    RecordFieldParticipationEvidenceBody,
    'evidenceFileId',
  ],
  [
    'field evidence participation',
    RecordFieldParticipationEvidenceParam,
    'participationId',
  ],
  ['participation vote', CastParticipationBody, 'voteId'],
  ['participation vote detail', CastParticipationBody, 'voteDetailId'],
  ['participation elector', CastParticipationBody, 'electorId'],
  ['participation candidate', CastParticipationBody, 'selectedCandidateId'],
  [
    'participation field session',
    CastParticipationBody,
    'fieldVotingSessionId',
  ],
  ['vote statistics vote', GetVoteStatisticsParam, 'voteId'],
  ['vote statistics detail', GetVoteStatisticsParam, 'voteDetailId'],
  ['candidate creation vote', CreateCandidateParam, 'voteId'],
  ['candidate creation detail', CreateCandidateParam, 'voteDetailId'],
  ['candidate attachment vote', CandidateAttachmentParam, 'voteId'],
  ['candidate attachment detail', CandidateAttachmentParam, 'voteDetailId'],
  ['candidate attachment candidate', CandidateAttachmentParam, 'candidateId'],
  ['candidate detail vote', GetCandidateParam, 'voteId'],
  ['candidate detail child vote', GetCandidateParam, 'voteDetailId'],
  ['candidate detail candidate', GetCandidateParam, 'candidateId'],
  ['candidate management vote', ManageCandidateParam, 'voteId'],
  ['candidate management detail', ManageCandidateParam, 'voteDetailId'],
  ['candidate management candidate', ManageCandidateParam, 'candidateId'],
  ['vote detail creation vote', CreateVoteDetailParam, 'voteId'],
  ['vote detail attachment vote', VoteDetailAttachmentParam, 'voteId'],
  ['vote detail attachment detail', VoteDetailAttachmentParam, 'voteDetailId'],
  ['vote detail lookup vote', GetVoteDetailParam, 'voteId'],
  ['vote detail lookup detail', GetVoteDetailParam, 'voteDetailId'],
  ['vote detail management vote', ManageVoteDetailParam, 'voteId'],
  ['vote detail management detail', ManageVoteDetailParam, 'voteDetailId'],
  ['SMS dispatch page vote', GetSmsDispatchPageParam, 'voteId'],
  ['SMS dispatch lookup vote', GetSmsDispatchParam, 'voteId'],
  ['SMS dispatch lookup dispatch', GetSmsDispatchParam, 'smsDispatchId'],
  [
    'electoral roll attachment body',
    AttachElectoralRollSnapshotBody,
    'electoralRollId',
  ],
  ['vote creation commission', CreateVoteBody, 'commissionId'],
  ['vote management param', VoteParam, 'voteId'],
  ['vote lookup param', GetVoteParam, 'voteId'],
];

describe('controller request UUID validation', () => {
  const pipe = new ValidationPipe();

  it.each(uuidValidationCases)(
    'accepts a valid UUID for %s',
    async (_name, metatype) => {
      await expect(
        pipe.transform({ ...validRequest }, { type: 'body', metatype }),
      ).resolves.toEqual(expect.objectContaining(validRequest));
    },
  );

  it.each(uuidValidationCases)(
    'rejects a malformed UUID for %s',
    async (_name, metatype, property) => {
      const invalidValue =
        property === 'managerIds' ? [INVALID_UUID] : INVALID_UUID;

      await expect(
        pipe.transform(
          { ...validRequest, [property]: invalidValue },
          { type: 'body', metatype },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each([
    [RecordFieldParticipationEvidenceBody, 'evidenceFileId'],
    [CastParticipationBody, 'fieldVotingSessionId'],
  ] as const)(
    'accepts omitted optional UUID on %p',
    async (metatype, property) => {
      const request = { ...validRequest };
      delete request[property];

      await expect(
        pipe.transform(request, { type: 'body', metatype }),
      ).resolves.toEqual(expect.objectContaining(request));
    },
  );
});
