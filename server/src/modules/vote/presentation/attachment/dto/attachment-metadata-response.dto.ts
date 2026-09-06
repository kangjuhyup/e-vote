import { ApiProperty } from '@nestjs/swagger';

export type AttachmentMetadataSource = {
  readonly id: string;
  readonly fileId: string;
  readonly type: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly sortOrder: number;
  readonly createdAt: Date;
};

export class AttachmentMetadataResponse {
  @ApiProperty({ format: 'uuid', description: '첨부파일 관계 ID입니다.' })
  readonly id: string;

  @ApiProperty({ format: 'uuid', description: '파일 메타데이터 ID입니다.' })
  readonly fileId: string;

  @ApiProperty({ example: 'NOTICE', description: '첨부파일 용도입니다.' })
  readonly type: string;

  @ApiProperty({ example: 'notice.pdf', description: '원본 파일명입니다.' })
  readonly originalName: string;

  @ApiProperty({ example: 'application/pdf', description: 'MIME 타입입니다.' })
  readonly mimeType: string;

  @ApiProperty({ example: 1024, description: '파일 크기(byte)입니다.' })
  readonly sizeBytes: number;

  @ApiProperty({ example: 0, description: '표시 순서입니다.' })
  readonly sortOrder: number;

  @ApiProperty({ format: 'date-time', description: '등록 시각입니다.' })
  readonly createdAt: string;

  private constructor(source: AttachmentMetadataSource) {
    this.id = source.id;
    this.fileId = source.fileId;
    this.type = source.type;
    this.originalName = source.originalName;
    this.mimeType = source.mimeType;
    this.sizeBytes = source.sizeBytes;
    this.sortOrder = source.sortOrder;
    this.createdAt = source.createdAt.toISOString();
  }

  static of(source: AttachmentMetadataSource): AttachmentMetadataResponse {
    return new AttachmentMetadataResponse(source);
  }
}
