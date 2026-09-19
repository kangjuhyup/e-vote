import type { PageResult } from './vote-operations.types';
import type { VoteStatus } from './vote.types';

export type VoteSmsPurpose =
  'VOTE_PARTICIPATION_REMINDER' | 'VOTE_RESULT_NOTICE' | 'UPCOMING_VOTE_NOTICE';

export type SmsPurpose = VoteSmsPurpose | 'FIELD_VOTING_SESSION_NOTICE';
export type SmsDeliveryStatus = 'SUCCESS' | 'FAILURE';

export interface ParticipationReminderTemplate {
  buttonLabel?: string;
  code: string;
  content: string;
}

export interface SmsDispatchSummary {
  failureCount: number;
  fieldVotingSessionId?: string;
  id: string;
  purpose: SmsPurpose;
  recipientCount: number;
  sentAt: string;
  successCount: number;
  voteId: string;
}

export interface SmsDelivery {
  electorId: string;
  failureReason?: string;
  recipientIdentifier: string;
  recipientName: string;
  status: SmsDeliveryStatus;
}

export interface SmsDispatchDetail extends SmsDispatchSummary {
  deliveries: SmsDelivery[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface SendVoteSmsInput {
  purpose: VoteSmsPurpose;
  voteId: string;
}

export interface SendFieldSessionSmsInput {
  fieldVotingSessionId: string;
  message: string;
  voteId: string;
}

export type SmsDispatchPage = PageResult<SmsDispatchSummary>;

export function getVoteSmsPurpose(
  status: VoteStatus,
): VoteSmsPurpose | undefined {
  switch (status) {
    case 'draft':
    case 'scheduled':
    case 'finalized':
      return 'UPCOMING_VOTE_NOTICE';
    case 'active':
      return 'VOTE_PARTICIPATION_REMINDER';
    case 'completed':
      return 'VOTE_RESULT_NOTICE';
    case 'canceled':
      return undefined;
  }
}
