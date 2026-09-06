export class RequestElectorSignatureUploadResult {
  private constructor(
    readonly storageKey: string,
    readonly uploadUrl: string,
    readonly expiresAt: Date,
  ) {}

  static of(params: {
    storageKey: string;
    uploadUrl: string;
    expiresAt: Date;
  }): RequestElectorSignatureUploadResult {
    return new RequestElectorSignatureUploadResult(
      params.storageKey,
      params.uploadUrl,
      params.expiresAt,
    );
  }
}
