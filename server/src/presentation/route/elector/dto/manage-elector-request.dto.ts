import { ApiProperty } from '@nestjs/swagger';

export class ManageElectorParam {
  @ApiProperty() readonly voteId!: string;
  @ApiProperty() readonly electorId!: string;
}

export class UpdateElectorBody {
  @ApiProperty() readonly identifier!: string;
  @ApiProperty({ required: false }) readonly groupKey?: string;
  @ApiProperty({ minimum: 1 }) readonly voteWeight!: number;
}
