import { ApiProperty } from '@nestjs/swagger';

const VoteDetailStatusResponse = {
  Draft: 'DRAFT',
  Open: 'OPEN',
  Closed: 'CLOSED',
  Canceled: 'CANCELED',
} as const;

export class CreateVoteDetailResponse {
  @ApiProperty({
    example: 'vote-detail-1',
    description: '생성된 자식 투표 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId: string;

  @ApiProperty({
    enum: Object.values(VoteDetailStatusResponse),
    example: VoteDetailStatusResponse.Draft,
    description: '생성된 자식 투표 상태입니다.',
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
  }): CreateVoteDetailResponse {
    return new CreateVoteDetailResponse(
      result.id,
      result.voteId,
      result.status,
    );
  }
}
