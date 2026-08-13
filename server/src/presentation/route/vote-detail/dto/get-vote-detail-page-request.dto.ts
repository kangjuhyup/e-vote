import { ApiProperty } from '@nestjs/swagger';

export class GetVoteDetailPageQuery {
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
    description: '페이지당 자식 투표 수입니다. 생략하면 20이고 최대 100입니다.',
  })
  readonly pageSize?: string;
}
