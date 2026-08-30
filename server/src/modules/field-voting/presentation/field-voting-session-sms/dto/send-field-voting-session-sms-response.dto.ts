import { ApiProperty } from '@nestjs/swagger';

type SendFieldVotingSessionSmsSource = {
  readonly smsDispatchId: string;
  readonly fieldVotingSessionId: string;
  readonly voteId: string;
  readonly sentAt: Date;
  readonly recipientCount: number;
  readonly successCount: number;
  readonly failureCount: number;
};

export class SendFieldVotingSessionSmsResponse {
  @ApiProperty({ example: 'FIELD_VOTING_SESSION_NOTICE' })
  readonly purpose = 'FIELD_VOTING_SESSION_NOTICE' as const;
  @ApiProperty() readonly smsDispatchId: string;
  @ApiProperty() readonly fieldVotingSessionId: string;
  @ApiProperty() readonly voteId: string;
  @ApiProperty({ format: 'date-time' }) readonly sentAt: string;
  @ApiProperty({ minimum: 0 }) readonly recipientCount: number;
  @ApiProperty({ minimum: 0 }) readonly successCount: number;
  @ApiProperty({ minimum: 0 }) readonly failureCount: number;

  private constructor(source: SendFieldVotingSessionSmsSource) {
    this.smsDispatchId = source.smsDispatchId;
    this.fieldVotingSessionId = source.fieldVotingSessionId;
    this.voteId = source.voteId;
    this.sentAt = source.sentAt.toISOString();
    this.recipientCount = source.recipientCount;
    this.successCount = source.successCount;
    this.failureCount = source.failureCount;
  }

  static of(
    source: SendFieldVotingSessionSmsSource,
  ): SendFieldVotingSessionSmsResponse {
    return new SendFieldVotingSessionSmsResponse(source);
  }
}
