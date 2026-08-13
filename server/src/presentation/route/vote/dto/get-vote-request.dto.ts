import { ApiProperty } from '@nestjs/swagger';

export class GetVoteParam {
  @ApiProperty({
    example: 'vote-1',
    description: '상세 조회할 부모 투표 ID입니다.',
  })
  readonly voteId!: string;
}
