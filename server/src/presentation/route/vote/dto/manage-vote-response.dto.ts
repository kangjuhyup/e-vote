import { ApiProperty } from '@nestjs/swagger';

export class ManageVoteResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly status: string;

  private constructor(source: {
    readonly id: string;
    readonly status: string;
  }) {
    this.id = source.id;
    this.status = source.status;
  }

  static of(source: {
    readonly id: string;
    readonly status: string;
  }): ManageVoteResponse {
    return new ManageVoteResponse(source);
  }
}
