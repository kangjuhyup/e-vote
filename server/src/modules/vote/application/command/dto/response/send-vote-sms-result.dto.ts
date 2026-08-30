import type { VoteSmsMessagePurpose } from '../../../../../../shared/domain/voting/type/sms-message-purpose.type';

export class SendVoteSmsResult {
  private constructor(
    readonly smsDispatchId: string,
    readonly purpose: VoteSmsMessagePurpose,
    readonly voteId: string,
    readonly sentAt: Date,
    readonly recipientCount: number,
    readonly successCount: number,
    readonly failureCount: number,
  ) {}

  static of(params: {
    readonly smsDispatchId: string;
    readonly purpose: VoteSmsMessagePurpose;
    readonly voteId: string;
    readonly sentAt: Date;
    readonly recipientCount: number;
    readonly successCount: number;
    readonly failureCount: number;
  }): SendVoteSmsResult {
    return new SendVoteSmsResult(
      params.smsDispatchId,
      params.purpose,
      params.voteId,
      params.sentAt,
      params.recipientCount,
      params.successCount,
      params.failureCount,
    );
  }
}
