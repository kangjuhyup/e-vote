import { ApiProperty } from '@nestjs/swagger';

export class RequestAttachmentUploadResponse {
  @ApiProperty({
    example: 'attachments/opaque-storage-key',
    description: '업로드 확인 요청에 사용할 스토리지 키입니다.',
  })
  readonly storageKey: string;

  @ApiProperty({
    example: 'https://storage.example/presigned-upload-url',
    description: '클라이언트가 파일을 업로드할 presigned URL입니다.',
  })
  readonly uploadUrl: string;

  @ApiProperty({
    example: '2026-08-13T00:05:00.000Z',
    description: '업로드 URL 만료 시각입니다.',
  })
  readonly expiresAt: Date;

  private constructor(storageKey: string, uploadUrl: string, expiresAt: Date) {
    this.storageKey = storageKey;
    this.uploadUrl = uploadUrl;
    this.expiresAt = expiresAt;
  }

  static of(result: {
    readonly storageKey: string;
    readonly uploadUrl: string;
    readonly expiresAt: Date;
  }): RequestAttachmentUploadResponse {
    return new RequestAttachmentUploadResponse(
      result.storageKey,
      result.uploadUrl,
      result.expiresAt,
    );
  }
}
