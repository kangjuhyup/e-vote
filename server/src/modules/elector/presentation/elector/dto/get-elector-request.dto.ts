import { ApiProperty } from '@nestjs/swagger';

export class GetElectorParam {
  @ApiProperty({
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId!: string;

  @ApiProperty({
    example: 'elector-1',
    description: '상세 조회할 선거인 ID입니다.',
  })
  readonly electorId!: string;
}
