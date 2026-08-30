export class SendFieldVotingSessionSmsResult {
  private constructor(
    readonly smsDispatchId: string,
    readonly fieldVotingSessionId: string,
    readonly voteId: string,
    readonly sentAt: Date,
    readonly recipientCount: number,
    readonly successCount: number,
    readonly failureCount: number,
  ) {}

  static of(params: {
    readonly smsDispatchId: string;
    readonly fieldVotingSessionId: string;
    readonly voteId: string;
    readonly sentAt: Date;
    readonly recipientCount: number;
    readonly successCount: number;
    readonly failureCount: number;
  }): SendFieldVotingSessionSmsResult {
    return new SendFieldVotingSessionSmsResult(
      params.smsDispatchId,
      params.fieldVotingSessionId,
      params.voteId,
      params.sentAt,
      params.recipientCount,
      params.successCount,
      params.failureCount,
    );
  }
}
