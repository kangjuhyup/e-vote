import { ApiProperty } from '@nestjs/swagger';

type CreateElectoralRollSource = {
  readonly id: string;
  readonly commissionId: string;
  readonly name: string;
  readonly revision: number;
};

export class CreateElectoralRollResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly commissionId: string;
  @ApiProperty() readonly name: string;
  @ApiProperty() readonly revision: number;

  private constructor(source: CreateElectoralRollSource) {
    this.id = source.id;
    this.commissionId = source.commissionId;
    this.name = source.name;
    this.revision = source.revision;
  }

  static of(source: CreateElectoralRollSource): CreateElectoralRollResponse {
    return new CreateElectoralRollResponse(source);
  }
}
