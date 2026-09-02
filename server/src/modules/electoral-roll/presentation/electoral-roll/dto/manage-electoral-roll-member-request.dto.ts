import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ElectoralRollParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly electoralRollId!: string;
}

export class ElectoralRollMemberParam extends ElectoralRollParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly memberId!: string;
}

export class UpdateElectoralRollMemberBody {
  @ApiProperty({ example: 'member-1' }) readonly identifier!: string;
  @ApiProperty({ required: false, example: 'group-1' })
  readonly groupKey?: string;
  @ApiProperty({ example: 1, minimum: 0.000001 }) readonly voteWeight!: number;
}
