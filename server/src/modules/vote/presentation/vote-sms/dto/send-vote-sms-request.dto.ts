import { ApiProperty } from '@nestjs/swagger';

export class SendVoteSmsBody {
  @ApiProperty({ example: '투표에 참여해 주세요.' })
  readonly message!: string;
}
