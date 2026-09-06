import type { AttachmentType } from '../../../port/persistence/command/attachment-repository.port';

type AttachmentViewProps = {
  readonly id: string;
  readonly fileId: string;
  readonly type: AttachmentType;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly sortOrder: number;
  readonly createdAt: Date;
};

export class AttachmentView {
  private constructor(
    readonly id: string,
    readonly fileId: string,
    readonly type: AttachmentType,
    readonly originalName: string,
    readonly mimeType: string,
    readonly sizeBytes: number,
    readonly sortOrder: number,
    readonly createdAt: Date,
  ) {}

  static of(params: AttachmentViewProps): AttachmentView {
    return new AttachmentView(
      params.id,
      params.fileId,
      params.type,
      params.originalName,
      params.mimeType,
      params.sizeBytes,
      params.sortOrder,
      params.createdAt,
    );
  }
}
