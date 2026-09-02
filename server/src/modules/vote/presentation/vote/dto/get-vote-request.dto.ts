import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetVoteParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: '상세 조회할 부모 투표 ID입니다.',
  })
  readonly voteId!: string;
}
