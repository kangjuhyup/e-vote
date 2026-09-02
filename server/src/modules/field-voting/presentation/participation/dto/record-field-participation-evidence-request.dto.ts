import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class RecordFieldParticipationEvidenceBody {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '66666666-6666-4666-8666-666666666666',
    description: '참여가 발생한 현장 또는 방문 투표 세션 ID입니다.',
  })
  readonly fieldVotingSessionId!: string;

  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '77777777-7777-4777-8777-777777777777',
    description: '참여 증빙을 확인한 선거관리위원 ID입니다.',
  })
  readonly verifiedByCommissionMemberId!: string;

  @IsOptional()
  @IsUUID()
  @ApiProperty({
    required: false,
    format: 'uuid',
    example: '88888888-8888-4888-8888-888888888888',
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
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '99999999-9999-4999-8999-999999999999',
    description: '증빙을 기록할 투표 참여 ID입니다.',
  })
  readonly participationId!: string;
}
