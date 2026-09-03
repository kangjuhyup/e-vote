import { ApiProperty } from '@nestjs/swagger';

export class AddElectoralRollMemberItemBody {
  @ApiProperty({ example: 'member-1' }) readonly identifier!: string;
  @ApiProperty({ required: false, example: 'group-1' })
  readonly groupKey?: string;
  @ApiProperty({ required: false, example: 1, minimum: 0.000001 })
  readonly voteWeight?: number;
  @ApiProperty({
    required: false,
    example: '홍길동',
    description: 'Required with phoneNumber for identity-verification votes.',
  })
  readonly name?: string;
  @ApiProperty({
    required: false,
    example: '010-1234-5678',
    description: 'Required with name for identity-verification votes.',
  })
  readonly phoneNumber?: string;
  @ApiProperty({ required: false, example: '1990-01-02', format: 'date' })
  readonly birthDate?: string;
}

export class AddElectoralRollMembersBody {
  @ApiProperty({
    type: [AddElectoralRollMemberItemBody],
    minItems: 1,
    maxItems: 50_000,
  })
  readonly members!: readonly AddElectoralRollMemberItemBody[];
}
