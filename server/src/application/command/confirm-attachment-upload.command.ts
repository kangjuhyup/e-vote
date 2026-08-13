import type {
  AttachmentTarget,
  AttachmentType,
} from '../port/attachment-repository.port';

export class ConfirmAttachmentUploadCommand {
  private constructor(
    readonly target: AttachmentTarget,
    readonly attachmentType: AttachmentType,
    readonly storageKey: string,
    readonly originalName: string,
    readonly mimeType: string,
    readonly sizeBytes: number,
    readonly sortOrder: number,
    readonly checksum?: string,
  ) {}

  static of(params: {
    target: AttachmentTarget;
    attachmentType: AttachmentType;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    sortOrder?: number;
    checksum?: string;
  }): ConfirmAttachmentUploadCommand {
    return new ConfirmAttachmentUploadCommand(
      params.target,
      params.attachmentType,
      params.storageKey,
      params.originalName,
      params.mimeType,
      params.sizeBytes,
      params.sortOrder ?? 0,
      params.checksum,
    );
  }
}
