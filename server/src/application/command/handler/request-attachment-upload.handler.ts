import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PORT } from '../../port/gateway/storage.port';
import type { StoragePort } from '../../port/gateway/storage.port';
import { AttachmentTargetValidator } from '../attachment-target.validator';
import {
  assertAttachmentType,
  assertAttachmentUploadMetadata,
} from '../attachment-upload.policy';
import { RequestAttachmentUploadCommand } from '../request-attachment-upload.command';

export type RequestAttachmentUploadResult = {
  readonly storageKey: string;
  readonly uploadUrl: string;
  readonly expiresAt: Date;
};

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
    await this.attachmentTargetValidator.assertExists(command.target);

    const presignedUrl = await this.storage.createPresignedPutObjectUrl({
      contentType: command.mimeType,
      contentLength: command.sizeBytes,
      metadata: this.createUploadMetadata(command),
    });

    return {
      storageKey: presignedUrl.storageKey,
      uploadUrl: presignedUrl.url,
      expiresAt: presignedUrl.expiresAt,
    };
  }

  private createUploadMetadata(
    command: RequestAttachmentUploadCommand,
  ): Record<string, string> {
    const metadata: Record<string, string> = {
      targetType: command.target.targetType,
      voteId: command.target.voteId,
      attachmentType: command.attachmentType,
      sortOrder: String(command.sortOrder),
    };

    if ('voteDetailId' in command.target) {
      metadata.voteDetailId = command.target.voteDetailId;
    }

    if ('candidateId' in command.target) {
      metadata.candidateId = command.target.candidateId;
    }

    return metadata;
  }
}
