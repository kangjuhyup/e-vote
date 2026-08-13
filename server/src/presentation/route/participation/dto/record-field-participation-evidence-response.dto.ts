import { ApiProperty } from '@nestjs/swagger';

export class RecordFieldParticipationEvidenceResponse {
  @ApiProperty({
    example: 'evidence-1',
    description: '생성된 현장 투표 참여 증빙 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'participation-1',
    description: '증빙이 기록된 투표 참여 ID입니다.',
  })
  readonly participationId: string;

  private constructor(id: string, participationId: string) {
    this.id = id;
    this.participationId = participationId;
  }

  static of(result: {
    readonly id: string;
    readonly participationId: string;
  }): RecordFieldParticipationEvidenceResponse {
    return new RecordFieldParticipationEvidenceResponse(
      result.id,
      result.participationId,
    );
  }
}
