import { ApiProperty } from '@nestjs/swagger';

export class ManageVoteDetailResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly voteId: string;
  @ApiProperty() readonly status: string;

  private constructor(source: {
    readonly id: string;
    readonly voteId: string;
    readonly status: string;
  }) {
    this.id = source.id;
    this.voteId = source.voteId;
    this.status = source.status;
  }
  static of(source: {
    readonly id: string;
    readonly voteId: string;
    readonly status: string;
  }) {
    return new ManageVoteDetailResponse(source);
  }
}
