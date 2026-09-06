import type { AttachmentTarget } from '../../../port/persistence/command/attachment-repository.port';

export class GetAttachmentDownloadUrlQuery {
  private constructor(
    readonly userPrincipalId: string,
    readonly target: AttachmentTarget,
    readonly attachmentId: string,
  ) {}

  static of(params: {
    userPrincipalId: string;
    target: AttachmentTarget;
    attachmentId: string;
  }): GetAttachmentDownloadUrlQuery {
    return new GetAttachmentDownloadUrlQuery(
      params.userPrincipalId,
      params.target,
      params.attachmentId,
    );
  }
}
