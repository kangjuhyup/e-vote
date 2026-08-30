import { ApiProperty } from '@nestjs/swagger';

export class ElectoralRollParam {
  @ApiProperty() readonly electoralRollId!: string;
}

export class ElectoralRollMemberParam extends ElectoralRollParam {
  @ApiProperty() readonly memberId!: string;
}

export class AddElectoralRollMemberBody {
  @ApiProperty({ example: 'member-1' }) readonly identifier!: string;
  @ApiProperty({ required: false, example: 'group-1' })
  readonly groupKey?: string;
  @ApiProperty({ required: false, example: 1, minimum: 0.000001 })
  readonly voteWeight?: number;
}

export class UpdateElectoralRollMemberBody {
  @ApiProperty({ example: 'member-1' }) readonly identifier!: string;
  @ApiProperty({ required: false, example: 'group-1' })
  readonly groupKey?: string;
  @ApiProperty({ example: 1, minimum: 0.000001 }) readonly voteWeight!: number;
}
