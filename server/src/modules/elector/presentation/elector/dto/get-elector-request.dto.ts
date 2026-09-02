import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetElectorParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId!: string;

  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '33333333-3333-4333-8333-333333333333',
    description: '상세 조회할 선거인 ID입니다.',
  })
  readonly electorId!: string;
}
