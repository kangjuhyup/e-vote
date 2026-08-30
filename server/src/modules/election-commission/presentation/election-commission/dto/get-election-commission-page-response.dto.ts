import { ApiProperty } from '@nestjs/swagger';
import { ElectionCommissionSummaryResponse } from './get-election-commission-response.dto';

type ElectionCommissionPageSource = {
  readonly items: readonly Parameters<
    typeof ElectionCommissionSummaryResponse.of
  >[0][];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export class GetElectionCommissionPageResponse {
  @ApiProperty({
    type: () => [ElectionCommissionSummaryResponse],
    description: '조회된 선거관리위원회 목록입니다.',
  })
  readonly items: readonly ElectionCommissionSummaryResponse[];

  @ApiProperty({
    example: 1,
    description: '현재 페이지 번호입니다.',
  })
  readonly page: number;

  @ApiProperty({
    example: 20,
    description: '페이지당 선거관리위원회 수입니다.',
  })
  readonly pageSize: number;

  @ApiProperty({
    example: 45,
    description: '전체 선거관리위원회 수입니다.',
  })
  readonly totalItems: number;

  @ApiProperty({
    example: 3,
    description: '전체 페이지 수입니다.',
  })
  readonly totalPages: number;

  private constructor(source: ElectionCommissionPageSource) {
    this.items = source.items.map((item) =>
      ElectionCommissionSummaryResponse.of(item),
    );
    this.page = source.page;
    this.pageSize = source.pageSize;
    this.totalItems = source.totalItems;
    this.totalPages = source.totalPages;
  }

  static of(
    source: ElectionCommissionPageSource,
  ): GetElectionCommissionPageResponse {
    return new GetElectionCommissionPageResponse(source);
  }
}
