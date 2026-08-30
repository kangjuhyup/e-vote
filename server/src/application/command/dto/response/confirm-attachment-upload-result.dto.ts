export class ConfirmAttachmentUploadResult {
  private constructor(
    readonly attachmentId: string,
    readonly fileId: string,
    readonly storageKey: string,
  ) {}

  static of(params: {
    readonly attachmentId: string;
    readonly fileId: string;
    readonly storageKey: string;
  }): ConfirmAttachmentUploadResult {
    return new ConfirmAttachmentUploadResult(
      params.attachmentId,
      params.fileId,
      params.storageKey,
    );
  }
}
