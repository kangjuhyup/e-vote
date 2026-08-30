import { ApiProperty } from '@nestjs/swagger';

export class CreateCandidateBody {
  @ApiProperty({
    example: 1,
    minimum: 1,
    description: '후보 번호입니다. 양의 정수여야 합니다.',
  })
  readonly candidateNo!: number;

  @ApiProperty({
    example: 'Kim',
    minLength: 1,
    maxLength: 100,
    description: '후보 이름입니다.',
  })
  readonly name!: string;
}

export class CreateCandidateParam {
  @ApiProperty({
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId!: string;

  @ApiProperty({
    example: 'vote-detail-1',
    description: '후보가 속할 자식 투표 ID입니다.',
  })
  readonly voteDetailId!: string;
}

export class CandidateAttachmentParam extends CreateCandidateParam {
  @ApiProperty({
    example: 'candidate-1',
    description: '후보 ID입니다.',
  })
  readonly candidateId!: string;
}
