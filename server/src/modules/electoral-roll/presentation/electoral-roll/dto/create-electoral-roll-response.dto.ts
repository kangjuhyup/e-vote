import { ApiProperty } from '@nestjs/swagger';

type CreateElectoralRollSource = {
  readonly id: string;
  readonly name: string;
  readonly revision: number;
};

export class CreateElectoralRollResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly name: string;
  @ApiProperty() readonly revision: number;

  private constructor(source: CreateElectoralRollSource) {
    this.id = source.id;
    this.name = source.name;
    this.revision = source.revision;
  }

  static of(source: CreateElectoralRollSource): CreateElectoralRollResponse {
    return new CreateElectoralRollResponse(source);
  }
}
