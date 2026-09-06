import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

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
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId!: string;

  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '44444444-4444-4444-8444-444444444444',
    description: '후보가 속할 자식 투표 ID입니다.',
  })
  readonly voteDetailId!: string;
}

export class CandidateAttachmentParam extends CreateCandidateParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '55555555-5555-4555-8555-555555555555',
    description: '후보 ID입니다.',
  })
  readonly candidateId!: string;
}

export class CandidateAttachmentManagementParam extends CandidateAttachmentParam {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '66666666-6666-4666-8666-666666666666',
    description: '첨부파일 관계 ID입니다.',
  })
  readonly attachmentId!: string;
}
