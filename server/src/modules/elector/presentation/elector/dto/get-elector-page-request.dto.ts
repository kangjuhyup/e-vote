import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GetElectorPageParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: '선거인이 속한 부모 투표 ID입니다.',
  })
  readonly voteId!: string;
}

export class GetElectorPageQuery {
  @ApiProperty({
    required: false,
    example: 1,
    minimum: 1,
    default: 1,
    description: '조회할 페이지 번호입니다. 생략하면 1입니다.',
  })
  readonly page?: string;

  @ApiProperty({
    required: false,
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
    description: '페이지당 선거인 수입니다. 생략하면 20이고 최대 100입니다.',
  })
  readonly pageSize?: string;
}
