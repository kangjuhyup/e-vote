export class RequestElectorSignatureUploadResult {
  private constructor(
    readonly storageKey: string,
    readonly uploadUrl: string,
    readonly uploadHeaders: Readonly<Record<string, string>>,
    readonly expiresAt: Date,
  ) {}

  static of(params: {
    storageKey: string;
    uploadUrl: string;
    uploadHeaders: Readonly<Record<string, string>>;
    expiresAt: Date;
  }): RequestElectorSignatureUploadResult {
    return new RequestElectorSignatureUploadResult(
      params.storageKey,
      params.uploadUrl,
      params.uploadHeaders,
      params.expiresAt,
    );
  }
}
