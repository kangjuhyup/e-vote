import { ApiProperty } from '@nestjs/swagger';

export class RecordFieldParticipationEvidenceBody {
  @ApiProperty({
    example: 'session-1',
    description: '참여가 발생한 현장 또는 방문 투표 세션 ID입니다.',
  })
  readonly fieldVotingSessionId!: string;

  @ApiProperty({
    example: 'member-1',
    description: '참여 증빙을 확인한 선거관리위원 ID입니다.',
  })
  readonly verifiedByCommissionMemberId!: string;

  @ApiProperty({
    required: false,
    example: 'file-1',
    description: '서명 또는 증빙 파일 ID입니다.',
  })
  readonly evidenceFileId?: string;

  @ApiProperty({
    required: false,
    example: 'signature checked',
    description: '참여 증빙 확인 메모입니다.',
  })
  readonly verificationNote?: string;

  @ApiProperty({
    example: '2026-08-20T01:10:00.000Z',
    description: '참여 증빙 확인 시각입니다.',
  })
  readonly verifiedAt!: string;
}

export class RecordFieldParticipationEvidenceParam {
  @ApiProperty({
    example: 'participation-1',
    description: '증빙을 기록할 투표 참여 ID입니다.',
  })
  readonly participationId!: string;
}
