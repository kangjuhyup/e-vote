import { ApiProperty } from '@nestjs/swagger';

const VoteSmsMessagePurposeResponse = {
  ParticipationReminder: 'VOTE_PARTICIPATION_REMINDER',
  ResultNotice: 'VOTE_RESULT_NOTICE',
  UpcomingNotice: 'UPCOMING_VOTE_NOTICE',
} as const;

type VoteSmsMessagePurposeResponse =
  (typeof VoteSmsMessagePurposeResponse)[keyof typeof VoteSmsMessagePurposeResponse];

type SendVoteSmsSource = {
  readonly smsDispatchId: string;
  readonly purpose: VoteSmsMessagePurposeResponse;
  readonly voteId: string;
  readonly sentAt: Date;
  readonly recipientCount: number;
  readonly successCount: number;
  readonly failureCount: number;
};

export class SendVoteSmsResponse {
  @ApiProperty() readonly smsDispatchId: string;
  @ApiProperty({
    enum: Object.values(VoteSmsMessagePurposeResponse),
  })
  readonly purpose: VoteSmsMessagePurposeResponse;
  @ApiProperty() readonly voteId: string;
  @ApiProperty({ format: 'date-time' }) readonly sentAt: string;
  @ApiProperty({ minimum: 0 }) readonly recipientCount: number;
  @ApiProperty({ minimum: 0 }) readonly successCount: number;
  @ApiProperty({ minimum: 0 }) readonly failureCount: number;

  private constructor(source: SendVoteSmsSource) {
    this.smsDispatchId = source.smsDispatchId;
    this.purpose = source.purpose;
    this.voteId = source.voteId;
    this.sentAt = source.sentAt.toISOString();
    this.recipientCount = source.recipientCount;
    this.successCount = source.successCount;
    this.failureCount = source.failureCount;
  }

  static of(source: SendVoteSmsSource): SendVoteSmsResponse {
    return new SendVoteSmsResponse(source);
  }
}
