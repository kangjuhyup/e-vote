import { ApiProperty } from '@nestjs/swagger';

export class GetCandidateParam {
  @ApiProperty({
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId!: string;

  @ApiProperty({
    example: 'vote-detail-1',
    description: '후보가 속한 자식 투표 ID입니다.',
  })
  readonly voteDetailId!: string;

  @ApiProperty({
    example: 'candidate-1',
    description: '상세 조회할 후보 ID입니다.',
  })
  readonly candidateId!: string;
}
