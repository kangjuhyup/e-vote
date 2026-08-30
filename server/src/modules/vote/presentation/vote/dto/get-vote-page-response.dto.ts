import { ApiProperty } from '@nestjs/swagger';
import { VoteSummaryResponse } from './get-vote-response.dto';

type VotePageSource = {
  readonly items: readonly Parameters<typeof VoteSummaryResponse.of>[0][];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export class GetVotePageResponse {
  @ApiProperty({
    type: () => [VoteSummaryResponse],
    description: '조회된 부모 투표 목록입니다.',
  })
  readonly items: readonly VoteSummaryResponse[];

  @ApiProperty({
    example: 1,
    description: '현재 페이지 번호입니다.',
  })
  readonly page: number;

  @ApiProperty({
    example: 20,
    description: '페이지당 투표 수입니다.',
  })
  readonly pageSize: number;

  @ApiProperty({
    example: 45,
    description: '전체 투표 수입니다.',
  })
  readonly totalItems: number;

  @ApiProperty({
    example: 3,
    description: '전체 페이지 수입니다.',
  })
  readonly totalPages: number;

  private constructor(source: VotePageSource) {
    this.items = source.items.map((item) => VoteSummaryResponse.of(item));
    this.page = source.page;
    this.pageSize = source.pageSize;
    this.totalItems = source.totalItems;
    this.totalPages = source.totalPages;
  }

  static of(source: VotePageSource): GetVotePageResponse {
    return new GetVotePageResponse(source);
  }
}
