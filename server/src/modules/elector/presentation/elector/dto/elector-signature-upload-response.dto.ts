import { ApiProperty } from '@nestjs/swagger';

export class RequestElectorSignatureUploadResponse {
  @ApiProperty({ description: '업로드 확인 요청에 사용할 스토리지 키입니다.' })
  readonly storageKey: string;

  @ApiProperty({ description: '서명 이미지를 PUT할 presigned URL입니다.' })
  readonly uploadUrl: string;

  @ApiProperty({ description: '업로드 URL 만료 시각입니다.' })
  readonly expiresAt: Date;

  private constructor(params: RequestElectorSignatureUploadResponse) {
    this.storageKey = params.storageKey;
    this.uploadUrl = params.uploadUrl;
    this.expiresAt = params.expiresAt;
  }

  static of(params: RequestElectorSignatureUploadResponse) {
    return new RequestElectorSignatureUploadResponse(params);
  }
}

export class ConfirmElectorSignatureUploadResponse {
  @ApiProperty({ description: '확정된 서명 파일 ID입니다.' })
  readonly fileId: string;

  @ApiProperty({ description: '서명 이미지 스토리지 키입니다.' })
  readonly storageKey: string;

  private constructor(params: ConfirmElectorSignatureUploadResponse) {
    this.fileId = params.fileId;
    this.storageKey = params.storageKey;
  }

  static of(params: ConfirmElectorSignatureUploadResponse) {
    return new ConfirmElectorSignatureUploadResponse(params);
  }
}
