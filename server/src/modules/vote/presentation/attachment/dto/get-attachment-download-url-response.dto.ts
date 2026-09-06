import { ApiProperty } from '@nestjs/swagger';

export class GetAttachmentDownloadUrlResponse {
  @ApiProperty({ format: 'uuid', description: '첨부파일 관계 ID입니다.' })
  readonly attachmentId: string;

  @ApiProperty({ format: 'uri', description: '단기 다운로드 URL입니다.' })
  readonly downloadUrl: string;

  @ApiProperty({ format: 'date-time', description: 'URL 만료 시각입니다.' })
  readonly expiresAt: string;

  private constructor(source: {
    attachmentId: string;
    downloadUrl: string;
    expiresAt: Date;
  }) {
    this.attachmentId = source.attachmentId;
    this.downloadUrl = source.downloadUrl;
    this.expiresAt = source.expiresAt.toISOString();
  }

  static of(source: {
    attachmentId: string;
    downloadUrl: string;
    expiresAt: Date;
  }): GetAttachmentDownloadUrlResponse {
    return new GetAttachmentDownloadUrlResponse(source);
  }
}
