import { ApiProperty } from '@nestjs/swagger';

const CandidateStatusResponse = {
  Active: 'ACTIVE',
  Withdrawn: 'WITHDRAWN',
} as const;

export class CreateCandidateResponse {
  @ApiProperty({
    example: 'candidate-1',
    description: '생성된 후보 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'vote-detail-1',
    description: '후보가 속한 자식 투표 ID입니다.',
  })
  readonly voteDetailId: string;

  @ApiProperty({
    enum: Object.values(CandidateStatusResponse),
    example: CandidateStatusResponse.Active,
    description: '생성된 후보 상태입니다.',
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
  }): CreateCandidateResponse {
    return new CreateCandidateResponse(
      result.id,
      result.voteDetailId,
      result.status,
    );
  }
}
