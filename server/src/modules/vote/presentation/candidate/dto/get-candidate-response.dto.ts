import { ApiProperty } from '@nestjs/swagger';
import {
  AttachmentMetadataResponse,
  type AttachmentMetadataSource,
} from '../../attachment/dto/attachment-metadata-response.dto';

const CandidateStatusResponse = {
  Active: 'ACTIVE',
  Withdrawn: 'WITHDRAWN',
} as const;

type CandidateSource = {
  readonly id: string;
  readonly voteId: string;
  readonly voteDetailId: string;
  readonly candidateNo: number;
  readonly name: string;
  readonly description: string;
  readonly status: string;
  readonly attachments?: readonly AttachmentMetadataSource[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class GetCandidateResponse {
  @ApiProperty({
    example: 'candidate-1',
    description: '후보 ID입니다.',
  })
  readonly id: string;

  @ApiProperty({
    example: 'vote-1',
    description: '부모 투표 ID입니다.',
  })
  readonly voteId: string;

  @ApiProperty({
    example: 'vote-detail-1',
    description: '후보가 속한 자식 투표 ID입니다.',
  })
  readonly voteDetailId: string;

  @ApiProperty({
    example: 1,
    description: '후보 번호입니다.',
  })
  readonly candidateNo: number;

  @ApiProperty({
    example: 'Kim',
    description: '후보 이름입니다.',
  })
  readonly name: string;

  @ApiProperty({
    example: '',
    description: '후보 설명입니다.',
  })
  readonly description: string;

  @ApiProperty({
    enum: Object.values(CandidateStatusResponse),
    example: CandidateStatusResponse.Active,
    description: '후보 상태입니다.',
  })
  readonly status: string;

  @ApiProperty({
    type: () => [AttachmentMetadataResponse],
    description: '후보자 첨부파일 메타데이터입니다.',
  })
  readonly attachments: readonly AttachmentMetadataResponse[];

  @ApiProperty({
    example: '2026-08-12T00:00:00.000Z',
    format: 'date-time',
    description: '생성 시각입니다.',
  })
  readonly createdAt: string;

  @ApiProperty({
    example: '2026-08-12T01:00:00.000Z',
    format: 'date-time',
    description: '수정 시각입니다.',
  })
  readonly updatedAt: string;

  private constructor(source: CandidateSource) {
    this.id = source.id;
    this.voteId = source.voteId;
    this.voteDetailId = source.voteDetailId;
    this.candidateNo = source.candidateNo;
    this.name = source.name;
    this.description = source.description;
    this.status = source.status;
    this.attachments = (source.attachments ?? []).map((attachment) =>
      AttachmentMetadataResponse.of(attachment),
    );
    this.createdAt = source.createdAt.toISOString();
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(source: CandidateSource): GetCandidateResponse {
    return new GetCandidateResponse(source);
  }
}
