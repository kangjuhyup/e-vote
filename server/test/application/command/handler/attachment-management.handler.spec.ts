import type { AttachmentRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/attachment-repository.port';
import { AttachmentTargetType } from '../../../../src/modules/vote/application/port/persistence/command/attachment-repository.port';
import type { StoragePort } from '../../../../src/shared/application/port/gateway/storage.port';
import { DeleteAttachmentCommand } from '../../../../src/modules/vote/application/command/dto/request/delete-attachment.command';
import { DeleteAttachmentHandler } from '../../../../src/modules/vote/application/command/handler/delete-attachment.handler';
import { GetAttachmentDownloadUrlQuery } from '../../../../src/modules/vote/application/query/dto/request/get-attachment-download-url.query';
import { GetAttachmentDownloadUrlHandler } from '../../../../src/modules/vote/application/query/handler/get-attachment-download-url.handler';
import type { AttachmentTargetValidator } from '../../../../src/modules/vote/application/command/attachment-target.validator';
import type { VoteSetupLifecyclePort } from '../../../../src/shared/application/port/capability/vote-billing.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';

const target = {
  targetType: AttachmentTargetType.Candidate,
  voteId: 'vote-1',
  voteDetailId: 'detail-1',
  candidateId: 'candidate-1',
} as const;

const attachedFile = {
  attachmentId: 'attachment-1',
  fileId: 'file-1',
  storageKey: 'attachments/opaque-key',
  originalName: 'poster.png',
  mimeType: 'image/png',
  sizeBytes: 1024,
  attachmentType: 'POSTER' as const,
  sortOrder: 0,
  createdAt: new Date('2026-09-06T00:00:00.000Z'),
};

describe('attachment management handlers', () => {
  it('authorizes the owner and returns only a short-lived download contract', async () => {
    const repository = repositoryStub();
    repository.findAttachedFile.mockResolvedValue(attachedFile);
    const storage = storageStub();
    storage.createPresignedGetObjectUrl.mockResolvedValue({
      storageKey: attachedFile.storageKey,
      url: 'https://storage.example/download',
      expiresAt: new Date('2026-09-06T00:05:00.000Z'),
    });
    const validator = validatorStub();
    const handler = new GetAttachmentDownloadUrlHandler(
      repository,
      storage,
      validator,
    );

    const result = await handler.execute(
      GetAttachmentDownloadUrlQuery.of({
        userPrincipalId: 'user-1',
        target,
        attachmentId: attachedFile.attachmentId,
      }),
    );

    expect(validator.assertOwnedBy.mock.calls).toEqual([[target, 'user-1']]);
    expect(repository.findAttachedFile.mock.calls).toEqual([
      [target, attachedFile.attachmentId],
    ]);
    expect(storage.createPresignedGetObjectUrl.mock.calls).toEqual([
      [attachedFile.storageKey],
    ]);
    expect(result).toEqual({
      attachmentId: 'attachment-1',
      downloadUrl: 'https://storage.example/download',
      expiresAt: new Date('2026-09-06T00:05:00.000Z'),
    });
    expect(result).not.toHaveProperty('storageKey');
  });

  it('locks the vote before deleting the object and metadata', async () => {
    const calls: string[] = [];
    const repository = repositoryStub();
    repository.findAttachedFile.mockResolvedValue(attachedFile);
    repository.deleteAttachedFile.mockImplementation(() => {
      calls.push('metadata-deleted');
      return Promise.resolve(true);
    });
    const storage = storageStub();
    storage.deleteObject.mockImplementation(() => {
      calls.push('object-deleted');
      return Promise.resolve();
    });
    const validator = validatorStub();
    validator.assertOwnedBy.mockImplementation(() => {
      calls.push('owner-checked');
      return Promise.resolve();
    });
    validator.assertMutable.mockImplementation(() => {
      calls.push('mutable-checked');
      return Promise.resolve();
    });
    const lifecycle = lifecycleStub();
    lifecycle.lockVote.mockImplementation(() => {
      calls.push('vote-locked');
      return Promise.resolve();
    });
    const handler = new DeleteAttachmentHandler(
      repository,
      storage,
      validator,
      lifecycle,
      transactionManagerStub(),
    );

    await handler.execute(
      DeleteAttachmentCommand.of({
        userPrincipalId: 'user-1',
        target,
        attachmentId: attachedFile.attachmentId,
      }),
    );

    expect(calls).toEqual([
      'vote-locked',
      'owner-checked',
      'mutable-checked',
      'metadata-deleted',
      'object-deleted',
    ]);
  });
});

function repositoryStub(): jest.Mocked<AttachmentRepositoryPort> {
  return {
    saveAttachedFile: jest.fn(),
    findAttachedFile: jest.fn(),
    deleteAttachedFile: jest.fn(),
  };
}

function storageStub(): jest.Mocked<StoragePort> {
  return {
    createPresignedPutObjectUrl: jest.fn(),
    createPresignedGetObjectUrl: jest.fn(),
    createPresignedDeleteObjectUrl: jest.fn(),
    getObjectMetadata: jest.fn(),
    deleteObject: jest.fn(),
  };
}

function validatorStub(): jest.Mocked<AttachmentTargetValidator> {
  return {
    assertExists: jest.fn(),
    assertOwnedBy: jest.fn(),
    assertMutable: jest.fn(),
  } as unknown as jest.Mocked<AttachmentTargetValidator>;
}

function lifecycleStub(): jest.Mocked<VoteSetupLifecyclePort> {
  return {
    lockVote: jest.fn(),
    lockForBilling: jest.fn(),
    finalizePaidBilling: jest.fn(),
    assertBillingCancellationAllowed: jest.fn(),
    releaseBilling: jest.fn(),
  };
}

function transactionManagerStub(): DatabaseTransactionManager {
  return {
    runInTransaction: (work) => work(),
  };
}
