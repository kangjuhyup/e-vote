import { Inject, Injectable } from '@nestjs/common';
import { AttachmentNotFoundError } from '../attachment.error';
import { AttachmentTargetValidator } from '../attachment-target.validator';
import { DeleteAttachmentCommand } from '../dto/request/delete-attachment.command';
import {
  ATTACHMENT_REPOSITORY_PORT,
  type AttachmentRepositoryPort,
} from '../../port/persistence/command/attachment-repository.port';
import {
  STORAGE_PORT,
  type StoragePort,
} from '../../../../../shared/application/port/gateway/storage.port';
import {
  VOTE_SETUP_LIFECYCLE_PORT,
  type VoteSetupLifecyclePort,
} from '../../../../../shared/application/port/capability/vote-billing.port';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';

@Injectable()
export class DeleteAttachmentHandler {
  constructor(
    @Inject(ATTACHMENT_REPOSITORY_PORT)
    private readonly attachmentRepository: AttachmentRepositoryPort,
    @Inject(STORAGE_PORT)
    private readonly storage: StoragePort,
    private readonly attachmentTargetValidator: AttachmentTargetValidator,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    private readonly transactionManager: DatabaseTransactionManager,
  ) {}

  async execute(command: DeleteAttachmentCommand): Promise<void> {
    await this.transactionManager.runInTransaction(
      async () => {
        await this.voteSetupLifecycle.lockVote(command.target.voteId);
        await this.attachmentTargetValidator.assertOwnedBy(
          command.target,
          command.userPrincipalId,
        );
        await this.attachmentTargetValidator.assertMutable(
          command.target,
          'deleted',
        );
        const attachment = await this.attachmentRepository.findAttachedFile(
          command.target,
          command.attachmentId,
        );
        if (!attachment) throw new AttachmentNotFoundError();

        const deleted = await this.attachmentRepository.deleteAttachedFile(
          command.target,
          command.attachmentId,
          new Date(),
        );
        if (!deleted) throw new AttachmentNotFoundError();

        await this.storage.deleteObject(attachment.storageKey);
      },
      { isolationLevel: 'serializable' },
    );
  }
}
