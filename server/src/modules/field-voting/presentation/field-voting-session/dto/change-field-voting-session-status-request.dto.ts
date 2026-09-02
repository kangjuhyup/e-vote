import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ChangeFieldVotingSessionStatusBody {
  @ApiProperty({
    example: '2026-08-20T00:00:00.000Z',
    description: '현장 투표 세션 상태 변경 시각입니다.',
  })
  readonly changedAt!: string;
}

export class ChangeFieldVotingSessionStatusParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '66666666-6666-4666-8666-666666666666',
    description: '상태를 변경할 현장 투표 세션 ID입니다.',
  })
  readonly fieldVotingSessionId!: string;
}
