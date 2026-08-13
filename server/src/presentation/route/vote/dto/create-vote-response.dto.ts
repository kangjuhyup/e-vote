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
    example: 'commission-1',
    description: '투표를 주관하는 선거관리위원회 ID입니다.',
  })
  readonly commissionId: string;

  @ApiProperty({
    enum: Object.values(VoteStatusResponse),
    example: VoteStatusResponse.Draft,
    description: '생성된 부모 투표 상태입니다.',
  })
  readonly status: string;

  private constructor(id: string, commissionId: string, status: string) {
    this.id = id;
    this.commissionId = commissionId;
    this.status = status;
  }

  static of(result: {
    readonly id: string;
    readonly commissionId: string;
    readonly status: string;
  }): CreateVoteResponse {
    return new CreateVoteResponse(
      result.id,
      result.commissionId,
      result.status,
    );
  }
}
