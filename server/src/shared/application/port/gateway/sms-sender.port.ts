import type { SmsDeliveryStatus } from '../../../domain/sms/type/sms-delivery-status.type';

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

export interface FieldVotingSessionSmsSendRequest extends VoteSmsSendRequest {
  readonly fieldVotingSessionId: string;
}

export interface SmsSenderPort {
  sendParticipationReminderToNonParticipants(
    request: VoteSmsSendRequest,
  ): Promise<SmsSendResult>;
  sendResultNotice(request: VoteSmsSendRequest): Promise<SmsSendResult>;
  sendUpcomingVoteNotice(request: VoteSmsSendRequest): Promise<SmsSendResult>;
  sendFieldVotingSessionNotice(
    request: FieldVotingSessionSmsSendRequest,
  ): Promise<SmsSendResult>;
}
