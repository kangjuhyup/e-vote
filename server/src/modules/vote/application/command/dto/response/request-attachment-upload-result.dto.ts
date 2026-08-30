export class RequestAttachmentUploadResult {
  private constructor(
    readonly storageKey: string,
    readonly uploadUrl: string,
    readonly expiresAt: Date,
  ) {}

  static of(params: {
    readonly storageKey: string;
    readonly uploadUrl: string;
    readonly expiresAt: Date;
  }): RequestAttachmentUploadResult {
    return new RequestAttachmentUploadResult(
      params.storageKey,
      params.uploadUrl,
      params.expiresAt,
    );
  }
}
