import type {
  AttachmentTarget,
  AttachmentType,
} from '../../../port/persistence/command/attachment-repository.port';

export class RequestAttachmentUploadCommand {
  private constructor(
    readonly target: AttachmentTarget,
    readonly attachmentType: AttachmentType,
    readonly originalName: string,
    readonly mimeType: string,
    readonly sizeBytes: number,
    readonly sortOrder: number,
  ) {}

  static of(params: {
    target: AttachmentTarget;
    attachmentType: AttachmentType;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    sortOrder?: number;
  }): RequestAttachmentUploadCommand {
    return new RequestAttachmentUploadCommand(
      params.target,
      params.attachmentType,
      params.originalName,
      params.mimeType,
      params.sizeBytes,
      params.sortOrder ?? 0,
    );
  }
}
