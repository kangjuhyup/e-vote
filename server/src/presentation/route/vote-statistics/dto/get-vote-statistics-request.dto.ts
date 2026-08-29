import { ApiProperty } from '@nestjs/swagger';

export class GetVoteStatisticsParam {
  @ApiProperty({
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId: string;

  @ApiProperty({
    example: 'vote-detail-1',
    description: '통계를 조회할 자식 투표 ID입니다.',
  })
  readonly voteDetailId: string;
}
