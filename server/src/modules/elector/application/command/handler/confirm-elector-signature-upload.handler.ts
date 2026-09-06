import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTOR_PARTICIPANT_ACCESS_PORT,
  ElectorParticipantForbiddenError,
  type ElectorParticipantAccessPort,
} from '../../../../../shared/application/port/capability/elector-participant-access.port';
import {
  STORAGE_PORT,
  type StoragePort,
  type StoredObjectMetadata,
} from '../../../../../shared/application/port/gateway/storage.port';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  ELECTOR_SIGNATURE_REPOSITORY_PORT,
  type ElectorSignatureRepositoryPort,
} from '../../port/persistence/command/elector-signature-repository.port';
import {
  assertElectorSignatureStorageKey,
  assertElectorSignatureUploadMetadata,
  normalizeElectorSignatureMimeType,
} from '../elector-signature-upload.policy';
import { ConfirmElectorSignatureUploadCommand } from '../dto/request/confirm-elector-signature-upload.command';
import { ConfirmElectorSignatureUploadResult } from '../dto/response/confirm-elector-signature-upload-result.dto';
import { ELECTOR_SIGNATURE_UPLOAD_PURPOSE } from './request-elector-signature-upload.handler';

export class ElectorSignatureObjectNotFoundError extends Error {
  constructor() {
    super('uploaded elector signature object not found');
  }
}

export class ElectorSignatureMetadataMismatchError extends Error {
  constructor() {
    super('uploaded elector signature metadata does not match request');
  }
}

export interface AuthorizedElectorSignatureUploadConfirmation {
  readonly voteId: string;
  readonly electorId: string;
  readonly storageKey: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksum?: string;
}

@Injectable()
export class ConfirmElectorSignatureUploadHandler {
  constructor(
    @Inject(STORAGE_PORT)
    private readonly storage: StoragePort,
    @Inject(ELECTOR_PARTICIPANT_ACCESS_PORT)
    private readonly participantAccess: ElectorParticipantAccessPort,
    @Inject(ELECTOR_SIGNATURE_REPOSITORY_PORT)
    private readonly repository: ElectorSignatureRepositoryPort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    private readonly transactionManager: DatabaseTransactionManager,
  ) {}

  async execute(
    command: ConfirmElectorSignatureUploadCommand,
  ): Promise<ConfirmElectorSignatureUploadResult> {
    await this.assertAuthorized(command);

    return this.executeAuthorized(command, () =>
      this.assertAuthorized(command),
    );
  }

  async executeAuthorized(
    command: AuthorizedElectorSignatureUploadConfirmation,
    reauthorize: () => Promise<void> = () => Promise.resolve(),
  ): Promise<ConfirmElectorSignatureUploadResult> {
    assertElectorSignatureUploadMetadata(command);
    assertElectorSignatureStorageKey(command.storageKey);

    const metadata = await this.storage.getObjectMetadata(command.storageKey);
    if (!metadata) {
      throw new ElectorSignatureObjectNotFoundError();
    }
    this.assertMetadataMatches(command, metadata);

    const saved = await this.transactionManager.runInTransaction(
      async () => {
        await reauthorize();
        return this.repository.save({
          voteId: command.voteId,
          electorId: command.electorId,
          file: {
            storageKey: command.storageKey,
            originalName: command.originalName.trim(),
            mimeType: normalizeElectorSignatureMimeType(command.mimeType),
            sizeBytes: command.sizeBytes,
            checksum: command.checksum,
          },
        });
      },
      { isolationLevel: 'serializable' },
    );

    return ConfirmElectorSignatureUploadResult.of(saved);
  }

  private async assertAuthorized(
    command: ConfirmElectorSignatureUploadCommand,
  ): Promise<void> {
    if (
      !(await this.participantAccess.isAuthorized(
        command.voteId,
        command.electorId,
        command.userPrincipalId,
      ))
    ) {
      throw new ElectorParticipantForbiddenError();
    }
  }

  private assertMetadataMatches(
    command: AuthorizedElectorSignatureUploadConfirmation,
    metadata: StoredObjectMetadata,
  ): void {
    const objectMetadata = metadata.metadata ?? {};
    if (
      metadata.storageKey !== command.storageKey ||
      metadata.contentLength !== command.sizeBytes ||
      normalizeElectorSignatureMimeType(metadata.contentType ?? '') !==
        normalizeElectorSignatureMimeType(command.mimeType) ||
      objectMetadata.purpose !== ELECTOR_SIGNATURE_UPLOAD_PURPOSE ||
      objectMetadata.voteid !== command.voteId ||
      objectMetadata.electorid !== command.electorId
    ) {
      throw new ElectorSignatureMetadataMismatchError();
    }
  }
}
