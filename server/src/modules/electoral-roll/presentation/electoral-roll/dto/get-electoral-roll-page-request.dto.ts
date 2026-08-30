import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetElectoralRollPageQuery {
  @ApiPropertyOptional({
    example: 'commission-1',
    description: '특정 선거관리위원회의 명부만 조회할 때 사용합니다.',
  })
  readonly commissionId?: string;

  @ApiPropertyOptional({
    example: '상반기',
    description:
      '명부 이름에 포함될 검색어입니다. 대소문자를 구분하지 않습니다.',
  })
  readonly q?: string;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
    description: '조회할 페이지 번호입니다.',
  })
  readonly page?: string;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    description: '페이지당 항목 수이며 최대 100입니다.',
  })
  readonly pageSize?: string;
}
