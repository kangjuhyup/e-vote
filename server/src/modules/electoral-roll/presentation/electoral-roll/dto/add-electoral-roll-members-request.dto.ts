import { ApiProperty } from '@nestjs/swagger';

export class AddElectoralRollMemberItemBody {
  @ApiProperty({ example: 'member-1' }) readonly identifier!: string;
  @ApiProperty({ required: false, example: 'group-1' })
  readonly groupKey?: string;
  @ApiProperty({ required: false, example: 1, minimum: 0.000001 })
  readonly voteWeight?: number;
}

export class AddElectoralRollMembersBody {
  @ApiProperty({
    type: [AddElectoralRollMemberItemBody],
    minItems: 1,
    maxItems: 50_000,
  })
  readonly members!: readonly AddElectoralRollMemberItemBody[];
}
