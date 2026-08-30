import { ApiProperty } from '@nestjs/swagger';
import { GetElectorResponse } from './get-elector-response.dto';

type ElectorPageSource = {
  readonly items: readonly Parameters<typeof GetElectorResponse.of>[0][];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export class GetElectorPageResponse {
  @ApiProperty({
    type: () => [GetElectorResponse],
    description: '조회된 선거인 목록입니다.',
  })
  readonly items: readonly GetElectorResponse[];

  @ApiProperty({
    example: 1,
    description: '현재 페이지 번호입니다.',
  })
  readonly page: number;

  @ApiProperty({
    example: 20,
    description: '페이지당 선거인 수입니다.',
  })
  readonly pageSize: number;

  @ApiProperty({
    example: 45,
    description: '전체 선거인 수입니다.',
  })
  readonly totalItems: number;

  @ApiProperty({
    example: 3,
    description: '전체 페이지 수입니다.',
  })
  readonly totalPages: number;

  private constructor(source: ElectorPageSource) {
    this.items = source.items.map((item) => GetElectorResponse.of(item));
    this.page = source.page;
    this.pageSize = source.pageSize;
    this.totalItems = source.totalItems;
    this.totalPages = source.totalPages;
  }

  static of(source: ElectorPageSource): GetElectorPageResponse {
    return new GetElectorPageResponse(source);
  }
}
