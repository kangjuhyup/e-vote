import type { AttachmentTarget } from '../../../port/persistence/command/attachment-repository.port';

export class DeleteAttachmentCommand {
  private constructor(
    readonly userPrincipalId: string,
    readonly target: AttachmentTarget,
    readonly attachmentId: string,
  ) {}

  static of(params: {
    userPrincipalId: string;
    target: AttachmentTarget;
    attachmentId: string;
  }): DeleteAttachmentCommand {
    return new DeleteAttachmentCommand(
      params.userPrincipalId,
      params.target,
      params.attachmentId,
    );
  }
}
