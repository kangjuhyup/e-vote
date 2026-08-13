import { ApiProperty } from '@nestjs/swagger';
import { GetCandidateResponse } from './get-candidate-response.dto';

type CandidatePageSource = {
  readonly items: readonly Parameters<typeof GetCandidateResponse.of>[0][];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export class GetCandidatePageResponse {
  @ApiProperty({
    type: () => [GetCandidateResponse],
    description: '조회된 후보 목록입니다.',
  })
  readonly items: readonly GetCandidateResponse[];

  @ApiProperty({
    example: 1,
    description: '현재 페이지 번호입니다.',
  })
  readonly page: number;

  @ApiProperty({
    example: 20,
    description: '페이지당 후보 수입니다.',
  })
  readonly pageSize: number;

  @ApiProperty({
    example: 45,
    description: '전체 후보 수입니다.',
  })
  readonly totalItems: number;

  @ApiProperty({
    example: 3,
    description: '전체 페이지 수입니다.',
  })
  readonly totalPages: number;

  private constructor(source: CandidatePageSource) {
    this.items = source.items.map((item) => GetCandidateResponse.of(item));
    this.page = source.page;
    this.pageSize = source.pageSize;
    this.totalItems = source.totalItems;
    this.totalPages = source.totalPages;
  }

  static of(source: CandidatePageSource): GetCandidatePageResponse {
    return new GetCandidatePageResponse(source);
  }
}
