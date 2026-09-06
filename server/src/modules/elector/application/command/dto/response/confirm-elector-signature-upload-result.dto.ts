export class ConfirmElectorSignatureUploadResult {
  private constructor(
    readonly fileId: string,
    readonly storageKey: string,
  ) {}

  static of(params: {
    fileId: string;
    storageKey: string;
  }): ConfirmElectorSignatureUploadResult {
    return new ConfirmElectorSignatureUploadResult(
      params.fileId,
      params.storageKey,
    );
  }
}
