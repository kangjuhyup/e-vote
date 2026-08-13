import { ApiProperty } from '@nestjs/swagger';

const ElectorStatusResponse = {
  Eligible: 'ELIGIBLE',
  Blocked: 'BLOCKED',
} as const;

export class CreateElectorResponse {
  @ApiProperty({
    example: 'elector-1',
    description: '생성된 선거인 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'vote-1',
    description: '선거인이 속한 부모 투표 ID입니다.',
  })
  readonly voteId: string;

  @ApiProperty({
    enum: Object.values(ElectorStatusResponse),
    example: ElectorStatusResponse.Eligible,
    description: '생성된 선거인 상태입니다.',
  })
  readonly status: string;

  private constructor(id: string, voteId: string, status: string) {
    this.id = id;
    this.voteId = voteId;
    this.status = status;
  }

  static of(result: {
    readonly id: string;
    readonly voteId: string;
    readonly status: string;
  }): CreateElectorResponse {
    return new CreateElectorResponse(result.id, result.voteId, result.status);
  }
}
