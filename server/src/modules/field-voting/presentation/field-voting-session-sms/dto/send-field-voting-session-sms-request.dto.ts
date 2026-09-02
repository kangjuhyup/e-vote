import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SendFieldVotingSessionSmsParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly fieldVotingSessionId!: string;
}

export class SendFieldVotingSessionSmsBody {
  @ApiProperty({ example: '방문 투표 장소와 시간을 안내드립니다.' })
  readonly message!: string;
}
