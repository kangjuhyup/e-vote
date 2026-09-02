import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetVoteStatisticsParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId: string;

  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '44444444-4444-4444-8444-444444444444',
    description: '통계를 조회할 자식 투표 ID입니다.',
  })
  readonly voteDetailId: string;
}
