import { ApiProperty } from '@nestjs/swagger';

export class CancelVoteUsageBillingOrderBody {
  @ApiProperty({ example: '투표 일정 변경' })
  readonly reason!: string;
}
