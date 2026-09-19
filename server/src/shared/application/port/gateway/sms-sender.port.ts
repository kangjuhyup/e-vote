import type { SmsDeliveryStatus } from '../../../domain/sms/type/sms-delivery-status.type';

import { PARTICIPATION_REMINDER_TEMPLATE } from '../../sms/participation-reminder-template';

export const SMS_SENDER_PORT = Symbol('SMS_SENDER_PORT');

export interface SmsRecipientDeliveryResult {
  readonly electorId: string;
  readonly recipientName: string;
  readonly recipientIdentifier: string;
  readonly status: SmsDeliveryStatus;
  readonly failureReason?: string;
}

export interface SmsSendResult {
  readonly deliveries: readonly SmsRecipientDeliveryResult[];
}

export interface VoteSmsSendRequest {
  readonly voteId: string;
  readonly message: string;
}

export interface VoteNoticeSmsSendRequest extends VoteSmsSendRequest {
  readonly templateCode: 'UPCOMING_VOTE_NOTICE' | 'VOTE_RESULT_NOTICE';
}

export interface ParticipationReminderSmsRecipient {
  readonly electorId: string;
  readonly invitationGeneration: number;
  readonly participationUrl: string;
}

export interface ParticipationReminderSmsSendRequest {
  readonly voteId: string;
  readonly templateCode: typeof PARTICIPATION_REMINDER_TEMPLATE.code;
  readonly recipients: readonly ParticipationReminderSmsRecipient[];
}

export interface FieldVotingSessionSmsSendRequest extends VoteSmsSendRequest {
  readonly fieldVotingSessionId: string;
}

export interface SmsSenderPort {
  sendParticipationReminderToNonParticipants(
    request: ParticipationReminderSmsSendRequest,
  ): Promise<SmsSendResult>;
  sendResultNotice(request: VoteNoticeSmsSendRequest): Promise<SmsSendResult>;
  sendUpcomingVoteNotice(
    request: VoteNoticeSmsSendRequest,
  ): Promise<SmsSendResult>;
  sendFieldVotingSessionNotice(
    request: FieldVotingSessionSmsSendRequest,
  ): Promise<SmsSendResult>;
}
