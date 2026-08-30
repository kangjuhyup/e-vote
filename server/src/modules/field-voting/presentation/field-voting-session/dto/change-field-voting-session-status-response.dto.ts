import { ApiProperty } from '@nestjs/swagger';

const FieldVotingSessionStatusResponse = {
  Scheduled: 'SCHEDULED',
  Open: 'OPEN',
  Closed: 'CLOSED',
  Canceled: 'CANCELED',
} as const;

export class ChangeFieldVotingSessionStatusResponse {
  @ApiProperty({
    example: 'session-1',
    description: '상태가 변경된 현장 투표 세션 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    enum: Object.values(FieldVotingSessionStatusResponse),
    example: FieldVotingSessionStatusResponse.Open,
    description: '변경된 현장 투표 세션 상태입니다.',
  })
  readonly status: string;

  private constructor(id: string, status: string) {
    this.id = id;
    this.status = status;
  }

  static of(result: {
    readonly id: string;
    readonly status: string;
  }): ChangeFieldVotingSessionStatusResponse {
    return new ChangeFieldVotingSessionStatusResponse(result.id, result.status);
  }
}
