import { ApiProperty } from '@nestjs/swagger';

const VoteStatusResponse = {
  Draft: 'DRAFT',
  Open: 'OPEN',
  Closed: 'CLOSED',
  Canceled: 'CANCELED',
} as const;

export class CreateVoteResponse {
  @ApiProperty({
    example: 'vote-1',
    description: '생성된 부모 투표 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    enum: Object.values(VoteStatusResponse),
    example: VoteStatusResponse.Draft,
    description: '생성된 부모 투표 상태입니다.',
  })
  readonly status: string;

  private constructor(id: string, status: string) {
    this.id = id;
    this.status = status;
  }

  static of(result: {
    readonly id: string;
    readonly status: string;
  }): CreateVoteResponse {
    return new CreateVoteResponse(result.id, result.status);
  }
}
