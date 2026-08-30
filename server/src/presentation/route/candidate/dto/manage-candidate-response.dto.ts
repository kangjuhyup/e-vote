import { ApiProperty } from '@nestjs/swagger';

export class ManageCandidateResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly voteDetailId: string;
  @ApiProperty() readonly status: string;
  private constructor(source: {
    readonly id: string;
    readonly voteDetailId: string;
    readonly status: string;
  }) {
    this.id = source.id;
    this.voteDetailId = source.voteDetailId;
    this.status = source.status;
  }
  static of(source: {
    readonly id: string;
    readonly voteDetailId: string;
    readonly status: string;
  }) {
    return new ManageCandidateResponse(source);
  }
}
