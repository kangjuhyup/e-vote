import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ManageElectorParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteId!: string;

  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly electorId!: string;
}

export class UpdateElectorBody {
  @ApiProperty() readonly identifier!: string;
  @ApiProperty({ required: false }) readonly groupKey?: string;
  @ApiProperty({ minimum: 1 }) readonly voteWeight!: number;
}
