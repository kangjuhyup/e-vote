import { ApiProperty } from '@nestjs/swagger';
import { GetVoteDetailResponse } from './get-vote-detail-response.dto';

type VoteDetailPageSource = {
  readonly items: readonly Parameters<typeof GetVoteDetailResponse.of>[0][];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export class GetVoteDetailPageResponse {
  @ApiProperty({
    type: () => [GetVoteDetailResponse],
    description: '조회된 자식 투표 목록입니다.',
  })
  readonly items: readonly GetVoteDetailResponse[];

  @ApiProperty({
    example: 1,
    description: '현재 페이지 번호입니다.',
  })
  readonly page: number;

  @ApiProperty({
    example: 20,
    description: '페이지당 자식 투표 수입니다.',
  })
  readonly pageSize: number;

  @ApiProperty({
    example: 45,
    description: '전체 자식 투표 수입니다.',
  })
  readonly totalItems: number;

  @ApiProperty({
    example: 3,
    description: '전체 페이지 수입니다.',
  })
  readonly totalPages: number;

  private constructor(source: VoteDetailPageSource) {
    this.items = source.items.map((item) => GetVoteDetailResponse.of(item));
    this.page = source.page;
    this.pageSize = source.pageSize;
    this.totalItems = source.totalItems;
    this.totalPages = source.totalPages;
  }

  static of(source: VoteDetailPageSource): GetVoteDetailPageResponse {
    return new GetVoteDetailPageResponse(source);
  }
}
