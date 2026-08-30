import { ApiProperty } from '@nestjs/swagger';

export class CreateVoteUsageBillingOrderBody {
  @ApiProperty({ example: 'vote-1' })
  readonly voteId!: string;
}
