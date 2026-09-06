import { Inject, Injectable } from '@nestjs/common';
import { AttachmentTargetValidator } from '../../command/attachment-target.validator';
import { AttachmentNotFoundError } from '../../command/attachment.error';
import {
  ATTACHMENT_REPOSITORY_PORT,
  type AttachmentRepositoryPort,
} from '../../port/persistence/command/attachment-repository.port';
import {
  STORAGE_PORT,
  type StoragePort,
} from '../../../../../shared/application/port/gateway/storage.port';
import { GetAttachmentDownloadUrlQuery } from '../dto/request/get-attachment-download-url.query';
import { AttachmentDownloadUrlView } from '../dto/response/attachment-download-url.view';

@Injectable()
export class GetAttachmentDownloadUrlHandler {
  constructor(
    @Inject(ATTACHMENT_REPOSITORY_PORT)
    private readonly attachmentRepository: AttachmentRepositoryPort,
    @Inject(STORAGE_PORT)
    private readonly storage: StoragePort,
    private readonly attachmentTargetValidator: AttachmentTargetValidator,
  ) {}

  async execute(
    query: GetAttachmentDownloadUrlQuery,
  ): Promise<AttachmentDownloadUrlView> {
    await this.attachmentTargetValidator.assertOwnedBy(
      query.target,
      query.userPrincipalId,
    );
    const attachment = await this.attachmentRepository.findAttachedFile(
      query.target,
      query.attachmentId,
    );
    if (!attachment) throw new AttachmentNotFoundError();

    const presigned = await this.storage.createPresignedGetObjectUrl(
      attachment.storageKey,
    );
    return AttachmentDownloadUrlView.of({
      attachmentId: attachment.attachmentId,
      downloadUrl: presigned.url,
      expiresAt: presigned.expiresAt,
    });
  }
}
