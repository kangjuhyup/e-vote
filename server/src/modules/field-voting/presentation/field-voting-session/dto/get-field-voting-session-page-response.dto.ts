import { ApiProperty } from '@nestjs/swagger';
import { GetFieldVotingSessionResponse } from './get-field-voting-session-response.dto';

type PageSource = {
  readonly items: readonly Parameters<
    typeof GetFieldVotingSessionResponse.of
  >[0][];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
};

export class GetFieldVotingSessionPageResponse {
  @ApiProperty({ type: () => [GetFieldVotingSessionResponse] })
  readonly items: readonly GetFieldVotingSessionResponse[];
  @ApiProperty() readonly page: number;
  @ApiProperty() readonly pageSize: number;
  @ApiProperty() readonly totalItems: number;
  @ApiProperty() readonly totalPages: number;

  private constructor(source: PageSource) {
    this.items = source.items.map((item) =>
      GetFieldVotingSessionResponse.of(item),
    );
    this.page = source.page;
    this.pageSize = source.pageSize;
    this.totalItems = source.totalItems;
    this.totalPages = source.totalPages;
  }

  static of(source: PageSource): GetFieldVotingSessionPageResponse {
    return new GetFieldVotingSessionPageResponse(source);
  }
}
