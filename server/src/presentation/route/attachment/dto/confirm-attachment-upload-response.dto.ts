import { ApiProperty } from '@nestjs/swagger';

export class ConfirmAttachmentUploadResponse {
  @ApiProperty({
    example: 'attachment-1',
    description: '저장된 첨부파일 연결 ID입니다.',
  })
  readonly attachmentId: string;

  @ApiProperty({
    example: 'file-1',
    description: '저장된 파일 메타데이터 ID입니다.',
  })
  readonly fileId: string;

  @ApiProperty({
    example: 'attachments/opaque-storage-key',
    description: '스토리지 키입니다.',
  })
  readonly storageKey: string;

  private constructor(
    attachmentId: string,
    fileId: string,
    storageKey: string,
  ) {
    this.attachmentId = attachmentId;
    this.fileId = fileId;
    this.storageKey = storageKey;
  }

  static of(result: {
    readonly attachmentId: string;
    readonly fileId: string;
    readonly storageKey: string;
  }): ConfirmAttachmentUploadResponse {
    return new ConfirmAttachmentUploadResponse(
      result.attachmentId,
      result.fileId,
      result.storageKey,
    );
  }
}
