import { Inject, Injectable } from '@nestjs/common';
import { ATTACHMENT_REPOSITORY_PORT } from '../../port/persistence/command/attachment-repository.port';
import type { AttachmentRepositoryPort } from '../../port/persistence/command/attachment-repository.port';
import { STORAGE_PORT } from '../../../../../shared/application/port/gateway/storage.port';
import type { StoragePort } from '../../../../../shared/application/port/gateway/storage.port';
import { AttachmentTargetValidator } from '../attachment-target.validator';
import {
  assertAttachmentType,
  assertAttachmentUploadMetadata,
  normalizeMimeType,
} from '../attachment-upload.policy';
import { ConfirmAttachmentUploadCommand } from '../dto/request/confirm-attachment-upload.command';
import { ConfirmAttachmentUploadResult } from '../dto/response/confirm-attachment-upload-result.dto';

export class UploadedAttachmentObjectNotFoundError extends Error {
  constructor() {
    super('uploaded attachment object not found');
  }
}

export class UploadedAttachmentMetadataMismatchError extends Error {
  constructor() {
    super('uploaded attachment metadata does not match request');
  }
}

@Injectable()
export class ConfirmAttachmentUploadHandler {
  constructor(
    @Inject(STORAGE_PORT)
    private readonly storage: StoragePort,
    @Inject(ATTACHMENT_REPOSITORY_PORT)
    private readonly attachmentRepository: AttachmentRepositoryPort,
    private readonly attachmentTargetValidator: AttachmentTargetValidator,
  ) {}

  async execute(
    command: ConfirmAttachmentUploadCommand,
  ): Promise<ConfirmAttachmentUploadResult> {
    assertAttachmentUploadMetadata(command);
    assertAttachmentType(command.target, command.attachmentType);
    await this.attachmentTargetValidator.assertExists(command.target);

    const metadata = await this.storage.getObjectMetadata(command.storageKey);

    if (!metadata) {
      throw new UploadedAttachmentObjectNotFoundError();
    }

    if (
      metadata.contentLength !== command.sizeBytes ||
      normalizeMimeType(metadata.contentType ?? '') !==
        normalizeMimeType(command.mimeType)
    ) {
      throw new UploadedAttachmentMetadataMismatchError();
    }

    const attachment = await this.attachmentRepository.saveAttachedFile({
      target: command.target,
      attachmentType: command.attachmentType,
      sortOrder: command.sortOrder,
      file: {
        storageKey: command.storageKey,
        originalName: command.originalName.trim(),
        mimeType: normalizeMimeType(command.mimeType),
        sizeBytes: command.sizeBytes,
        checksum: command.checksum,
      },
    });

    return ConfirmAttachmentUploadResult.of(attachment);
  }
}
