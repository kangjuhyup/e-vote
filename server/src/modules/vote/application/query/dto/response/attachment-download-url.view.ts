export class AttachmentDownloadUrlView {
  private constructor(
    readonly attachmentId: string,
    readonly downloadUrl: string,
    readonly expiresAt: Date,
  ) {}

  static of(params: {
    attachmentId: string;
    downloadUrl: string;
    expiresAt: Date;
  }): AttachmentDownloadUrlView {
    return new AttachmentDownloadUrlView(
      params.attachmentId,
      params.downloadUrl,
      params.expiresAt,
    );
  }
}
