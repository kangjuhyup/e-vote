import { ApiProperty } from '@nestjs/swagger';

const FieldVotingSessionStatusResponse = {
  Scheduled: 'SCHEDULED',
  Open: 'OPEN',
  Closed: 'CLOSED',
  Canceled: 'CANCELED',
} as const;

export class CreateFieldVotingSessionResponse {
  @ApiProperty({
    example: 'session-1',
    description: '생성된 현장 투표 세션 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'vote-1',
    description: '현장 투표 세션이 속한 부모 투표 ID입니다.',
  })
  readonly voteId: string;

  @ApiProperty({
    enum: Object.values(FieldVotingSessionStatusResponse),
    example: FieldVotingSessionStatusResponse.Scheduled,
    description: '생성된 현장 투표 세션 상태입니다.',
  })
  readonly status: string;

  private constructor(id: string, voteId: string, status: string) {
    this.id = id;
    this.voteId = voteId;
    this.status = status;
  }

  static of(result: {
    readonly id: string;
    readonly voteId: string;
    readonly status: string;
  }): CreateFieldVotingSessionResponse {
    return new CreateFieldVotingSessionResponse(
      result.id,
      result.voteId,
      result.status,
    );
  }
}
