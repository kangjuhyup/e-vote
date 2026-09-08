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
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      'Content-Type': 'application/pdf',
      'x-amz-meta-attachmenttype': 'NOTICE',
    },
    description:
      'presigned URL로 PUT할 때 그대로 전송해야 하는 허용된 헤더입니다.',
  })
  readonly uploadHeaders: Readonly<Record<string, string>>;

  @ApiProperty({
    example: '2026-08-13T00:05:00.000Z',
    description: '업로드 URL 만료 시각입니다.',
  })
  readonly expiresAt: Date;

  private constructor(
    storageKey: string,
    uploadUrl: string,
    uploadHeaders: Readonly<Record<string, string>>,
    expiresAt: Date,
  ) {
    this.storageKey = storageKey;
    this.uploadUrl = uploadUrl;
    this.uploadHeaders = uploadHeaders;
    this.expiresAt = expiresAt;
  }

  static of(result: {
    readonly storageKey: string;
    readonly uploadUrl: string;
    readonly uploadHeaders: Readonly<Record<string, string>>;
    readonly expiresAt: Date;
  }): RequestAttachmentUploadResponse {
    return new RequestAttachmentUploadResponse(
      result.storageKey,
      result.uploadUrl,
      result.uploadHeaders,
      result.expiresAt,
    );
  }
}
