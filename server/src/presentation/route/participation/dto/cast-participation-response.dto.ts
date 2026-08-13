import { ApiProperty } from '@nestjs/swagger';

const ParticipationStatusResponse = {
  Cast: 'CAST',
  Canceled: 'CANCELED',
} as const;

export class CastParticipationResponse {
  @ApiProperty({
    example: 'participation-1',
    description: '생성된 투표 참여 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'detail-1',
    description: '참여한 자식 투표 ID입니다.',
  })
  readonly voteDetailId: string;

  @ApiProperty({
    enum: Object.values(ParticipationStatusResponse),
    example: ParticipationStatusResponse.Cast,
    description: '투표 참여 상태입니다.',
  })
  readonly status: string;

  private constructor(id: string, voteDetailId: string, status: string) {
    this.id = id;
    this.voteDetailId = voteDetailId;
    this.status = status;
  }

  static of(result: {
    readonly id: string;
    readonly voteDetailId: string;
    readonly status: string;
  }): CastParticipationResponse {
    return new CastParticipationResponse(
      result.id,
      result.voteDetailId,
      result.status,
    );
  }
}
