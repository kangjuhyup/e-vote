import { ApiProperty } from '@nestjs/swagger';

export class ChangeFieldVotingSessionStatusBody {
  @ApiProperty({
    example: '2026-08-20T00:00:00.000Z',
    description: '현장 투표 세션 상태 변경 시각입니다.',
  })
  readonly changedAt!: string;
}

export class ChangeFieldVotingSessionStatusParam {
  @ApiProperty({
    example: 'session-1',
    description: '상태를 변경할 현장 투표 세션 ID입니다.',
  })
  readonly fieldVotingSessionId!: string;
}
