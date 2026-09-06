import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PORT } from '../../../../../shared/application/port/gateway/storage.port';
import type { StoragePort } from '../../../../../shared/application/port/gateway/storage.port';
import { AttachmentTargetValidator } from '../attachment-target.validator';
import {
  assertAttachmentType,
  assertAttachmentUploadMetadata,
  createAttachmentUploadMetadata,
} from '../attachment-upload.policy';
import { RequestAttachmentUploadCommand } from '../dto/request/request-attachment-upload.command';
import { RequestAttachmentUploadResult } from '../dto/response/request-attachment-upload-result.dto';

@Injectable()
export class RequestAttachmentUploadHandler {
  constructor(
    @Inject(STORAGE_PORT)
    private readonly storage: StoragePort,
    private readonly attachmentTargetValidator: AttachmentTargetValidator,
  ) {}

  async execute(
    command: RequestAttachmentUploadCommand,
  ): Promise<RequestAttachmentUploadResult> {
    assertAttachmentUploadMetadata(command);
    assertAttachmentType(command.target, command.attachmentType);
    await this.attachmentTargetValidator.assertOwnedBy(
      command.target,
      command.userPrincipalId,
    );
    await this.attachmentTargetValidator.assertMutable(command.target);

    const presignedUrl = await this.storage.createPresignedPutObjectUrl({
      contentType: command.mimeType,
      contentLength: command.sizeBytes,
      metadata: createAttachmentUploadMetadata(
        command.target,
        command.attachmentType,
        command.sortOrder,
      ),
    });

    return RequestAttachmentUploadResult.of({
      storageKey: presignedUrl.storageKey,
      uploadUrl: presignedUrl.url,
      expiresAt: presignedUrl.expiresAt,
    });
  }
}
