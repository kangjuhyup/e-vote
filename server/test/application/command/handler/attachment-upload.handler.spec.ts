import {
  AttachmentRepositoryPort,
  AttachmentTargetType,
  CandidateAttachmentType,
  VoteAttachmentType,
} from '../../../../src/modules/vote/application/port/persistence/command/attachment-repository.port';
import { CandidateRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/candidate-repository.port';
import { StoragePort } from '../../../../src/shared/application/port/gateway/storage.port';
import { VoteDetailRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-detail-repository.port';
import { VoteRepositoryPort } from '../../../../src/modules/vote/application/port/persistence/command/vote-repository.port';
import {
  AttachmentAccessDeniedError,
  AttachmentTargetNotFoundError,
  AttachmentTargetValidator,
} from '../../../../src/modules/vote/application/command/attachment-target.validator';
import { UnsupportedAttachmentTypeError } from '../../../../src/modules/vote/application/command/attachment-upload.policy';
import { ConfirmAttachmentUploadCommand } from '../../../../src/modules/vote/application/command/dto/request/confirm-attachment-upload.command';
import {
  ConfirmAttachmentUploadHandler,
  UploadedAttachmentMetadataMismatchError,
  UploadedAttachmentObjectNotFoundError,
} from '../../../../src/modules/vote/application/command/handler/confirm-attachment-upload.handler';
import { RequestAttachmentUploadCommand } from '../../../../src/modules/vote/application/command/dto/request/request-attachment-upload.command';
import { RequestAttachmentUploadHandler } from '../../../../src/modules/vote/application/command/handler/request-attachment-upload.handler';
import type { VoteSetupLifecyclePort } from '../../../../src/shared/application/port/capability/vote-billing.port';
import type {
  DatabaseTransactionManager,
  DatabaseTransactionOptions,
} from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';

describe('attachment upload handlers', () => {
  it('creates a presigned upload URL after validating target and upload metadata', async () => {
    const storage = createStoragePort();
    storage.createPresignedPutObjectUrl.mockResolvedValue({
      storageKey: 'attachments/generated-key',
      url: 'https://storage.example/upload',
      expiresAt: new Date('2026-08-13T00:05:00.000Z'),
    });
    const handler = new RequestAttachmentUploadHandler(
      storage,
      createTargetValidator({
        vote: { id: 'vote-1' },
      }),
    );

    const result = await handler.execute(
      RequestAttachmentUploadCommand.of({
        userPrincipalId: 'user-1',
        target: {
          targetType: AttachmentTargetType.Vote,
          voteId: 'vote-1',
        },
        attachmentType: VoteAttachmentType.Notice,
        originalName: 'notice.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        sortOrder: 1,
      }),
    );

    expect(result).toEqual({
      storageKey: 'attachments/generated-key',
      uploadUrl: 'https://storage.example/upload',
      uploadHeaders: {
        'Content-Type': 'application/pdf',
        'x-amz-meta-targettype': AttachmentTargetType.Vote,
        'x-amz-meta-voteid': 'vote-1',
        'x-amz-meta-attachmenttype': VoteAttachmentType.Notice,
        'x-amz-meta-sortorder': '1',
      },
      expiresAt: new Date('2026-08-13T00:05:00.000Z'),
    });
    expect(storage.createPresignedPutObjectUrl.mock.calls[0][0]).toEqual({
      contentType: 'application/pdf',
      contentLength: 1024,
      metadata: {
        targetType: AttachmentTargetType.Vote,
        voteId: 'vote-1',
        attachmentType: VoteAttachmentType.Notice,
        sortOrder: '1',
      },
    });
  });

  it('rejects attachment types that do not belong to the target', async () => {
    const storage = createStoragePort();
    const handler = new RequestAttachmentUploadHandler(
      storage,
      createTargetValidator({
        voteDetail: {
          id: 'detail-1',
          voteId: 'vote-1',
        },
        candidate: {
          id: 'candidate-1',
          voteDetailId: 'detail-1',
        },
      }),
    );

    await expect(
      handler.execute(
        RequestAttachmentUploadCommand.of({
          userPrincipalId: 'user-1',
          target: {
            targetType: AttachmentTargetType.Candidate,
            voteId: 'vote-1',
            voteDetailId: 'detail-1',
            candidateId: 'candidate-1',
          },
          attachmentType: VoteAttachmentType.Notice,
          originalName: 'notice.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        }),
      ),
    ).rejects.toThrow(UnsupportedAttachmentTypeError);
    expect(storage.createPresignedPutObjectUrl.mock.calls).toHaveLength(0);
  });

  it('rejects a non-creator before issuing an upload URL', async () => {
    const storage = createStoragePort();
    const handler = new RequestAttachmentUploadHandler(
      storage,
      createTargetValidator({ vote: { id: 'vote-1' } }),
    );

    await expect(
      handler.execute(
        RequestAttachmentUploadCommand.of({
          userPrincipalId: 'other-user',
          target: {
            targetType: AttachmentTargetType.Vote,
            voteId: 'vote-1',
          },
          attachmentType: VoteAttachmentType.Notice,
          originalName: 'notice.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        }),
      ),
    ).rejects.toThrow(AttachmentAccessDeniedError);
    expect(storage.createPresignedPutObjectUrl.mock.calls).toHaveLength(0);
  });

  it('rejects upload confirmation when the storage object is missing', async () => {
    const storage = createStoragePort();
    storage.getObjectMetadata.mockResolvedValue(undefined);
    const attachmentRepository = createAttachmentRepository();
    const handler = new ConfirmAttachmentUploadHandler(
      storage,
      attachmentRepository,
      createTargetValidator({
        vote: { id: 'vote-1' },
      }),
      voteLifecycleStub(),
      transactionManagerStub(),
    );

    await expect(
      handler.execute(
        ConfirmAttachmentUploadCommand.of({
          userPrincipalId: 'user-1',
          target: {
            targetType: AttachmentTargetType.Vote,
            voteId: 'vote-1',
          },
          attachmentType: VoteAttachmentType.Guide,
          storageKey: 'attachments/missing-key',
          originalName: 'guide.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        }),
      ),
    ).rejects.toThrow(UploadedAttachmentObjectNotFoundError);
    expect(attachmentRepository.saveAttachedFile.mock.calls).toHaveLength(0);
  });

  it('saves file metadata and attachment after uploaded object metadata matches', async () => {
    const storage = createStoragePort();
    storage.getObjectMetadata.mockResolvedValue({
      storageKey: 'attachments/poster-key',
      contentType: 'IMAGE/PNG',
      contentLength: 2048,
      metadata: {
        targettype: AttachmentTargetType.Candidate,
        voteid: 'vote-1',
        votedetailid: 'detail-1',
        candidateid: 'candidate-1',
        attachmenttype: CandidateAttachmentType.Poster,
        sortorder: '2',
      },
    });
    const attachmentRepository = createAttachmentRepository();
    attachmentRepository.saveAttachedFile.mockResolvedValue({
      attachmentId: 'attachment-1',
      fileId: 'file-1',
      storageKey: 'attachments/poster-key',
    });
    const handler = new ConfirmAttachmentUploadHandler(
      storage,
      attachmentRepository,
      createTargetValidator({
        voteDetail: {
          id: 'detail-1',
          voteId: 'vote-1',
        },
        candidate: {
          id: 'candidate-1',
          voteDetailId: 'detail-1',
        },
      }),
      voteLifecycleStub(),
      transactionManagerStub(),
    );

    const result = await handler.execute(
      ConfirmAttachmentUploadCommand.of({
        userPrincipalId: 'user-1',
        target: {
          targetType: AttachmentTargetType.Candidate,
          voteId: 'vote-1',
          voteDetailId: 'detail-1',
          candidateId: 'candidate-1',
        },
        attachmentType: CandidateAttachmentType.Poster,
        storageKey: 'attachments/poster-key',
        originalName: ' poster.png ',
        mimeType: 'image/png',
        sizeBytes: 2048,
        checksum: 'sha256:poster',
        sortOrder: 2,
      }),
    );

    expect(result).toEqual({
      attachmentId: 'attachment-1',
      fileId: 'file-1',
      storageKey: 'attachments/poster-key',
    });
    expect(attachmentRepository.saveAttachedFile.mock.calls[0][0]).toEqual({
      target: {
        targetType: AttachmentTargetType.Candidate,
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
        candidateId: 'candidate-1',
      },
      attachmentType: CandidateAttachmentType.Poster,
      sortOrder: 2,
      file: {
        storageKey: 'attachments/poster-key',
        originalName: 'poster.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        checksum: 'sha256:poster',
      },
    });
  });

  it('rejects a storage key issued for a different attachment target', async () => {
    const storage = createStoragePort();
    storage.getObjectMetadata.mockResolvedValue({
      storageKey: 'attachments/other-target-key',
      contentType: 'application/pdf',
      contentLength: 1024,
      metadata: {
        targettype: AttachmentTargetType.Vote,
        voteid: 'different-vote',
        attachmenttype: VoteAttachmentType.Notice,
        sortorder: '0',
      },
    });
    const repository = createAttachmentRepository();
    const handler = new ConfirmAttachmentUploadHandler(
      storage,
      repository,
      createTargetValidator({ vote: { id: 'vote-1' } }),
      voteLifecycleStub(),
      transactionManagerStub(),
    );

    await expect(
      handler.execute(
        ConfirmAttachmentUploadCommand.of({
          userPrincipalId: 'user-1',
          target: {
            targetType: AttachmentTargetType.Vote,
            voteId: 'vote-1',
          },
          attachmentType: VoteAttachmentType.Notice,
          storageKey: 'attachments/other-target-key',
          originalName: 'notice.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        }),
      ),
    ).rejects.toThrow(UploadedAttachmentMetadataMismatchError);
    expect(repository.saveAttachedFile.mock.calls).toHaveLength(0);
  });

  it('revalidates mutability under the vote lock before persisting metadata', async () => {
    const storage = createStoragePort();
    storage.getObjectMetadata.mockResolvedValue({
      storageKey: 'attachments/notice-key',
      contentType: 'application/pdf',
      contentLength: 1024,
      metadata: {
        targettype: AttachmentTargetType.Vote,
        voteid: 'vote-1',
        attachmenttype: VoteAttachmentType.Notice,
        sortorder: '0',
      },
    });
    const attachmentRepository = createAttachmentRepository();
    const validator = {
      assertExists: jest.fn().mockResolvedValue(undefined),
      assertOwnedBy: jest.fn().mockResolvedValue(undefined),
      assertMutable: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(
          new Error('billing-locked vote resources cannot be created'),
        ),
    } as unknown as AttachmentTargetValidator;
    const lifecycle = voteLifecycleStub();
    const transactionManager = transactionManagerStub();
    const handler = new ConfirmAttachmentUploadHandler(
      storage,
      attachmentRepository,
      validator,
      lifecycle,
      transactionManager,
    );

    await expect(
      handler.execute(
        ConfirmAttachmentUploadCommand.of({
          userPrincipalId: 'user-1',
          target: {
            targetType: AttachmentTargetType.Vote,
            voteId: 'vote-1',
          },
          attachmentType: VoteAttachmentType.Notice,
          storageKey: 'attachments/notice-key',
          originalName: 'notice.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
        }),
      ),
    ).rejects.toThrow('billing-locked vote resources cannot be created');

    expect(lifecycle.lockVote.mock.calls).toEqual([['vote-1']]);
    expect(attachmentRepository.saveAttachedFile.mock.calls).toHaveLength(0);
    expect(transactionManager.calls.mock.calls).toEqual([
      [expect.any(Function), { isolationLevel: 'serializable' }],
    ]);
  });

  it('rejects targets outside the requested parent hierarchy', async () => {
    const validator = createTargetValidator({
      voteDetail: {
        id: 'detail-1',
        voteId: 'different-vote',
      },
    });

    await expect(
      validator.assertExists({
        targetType: AttachmentTargetType.VoteDetail,
        voteId: 'vote-1',
        voteDetailId: 'detail-1',
      }),
    ).rejects.toThrow(AttachmentTargetNotFoundError);
  });
});

function createStoragePort(): jest.Mocked<StoragePort> {
  return {
    createPresignedPutObjectUrl: jest.fn(),
    createPresignedGetObjectUrl: jest.fn(),
    createPresignedDeleteObjectUrl: jest.fn(),
    getObjectMetadata: jest.fn(),
    deleteObject: jest.fn(),
  };
}

function createAttachmentRepository(): jest.Mocked<AttachmentRepositoryPort> {
  return {
    saveAttachedFile: jest.fn(),
    findAttachedFile: jest.fn(),
    deleteAttachedFile: jest.fn(),
  };
}

function createTargetValidator(records: {
  readonly vote?: object;
  readonly voteDetail?: {
    readonly id: string;
    readonly voteId: string;
  };
  readonly candidate?: {
    readonly id: string;
    readonly voteDetailId: string;
  };
}): AttachmentTargetValidator {
  const vote =
    records.vote ??
    (records.voteDetail
      ? {
          id: records.voteDetail.voteId,
        }
      : undefined);
  const voteRecord = vote
    ? {
        ...vote,
        isCreatedBy: (userPrincipalId: string) => userPrincipalId === 'user-1',
        assertChildResourcesMutable: jest.fn(),
      }
    : undefined;
  const voteDetailRecord = records.voteDetail
    ? {
        ...records.voteDetail,
        belongsToVote: (voteId: string) =>
          records.voteDetail?.voteId === voteId,
        assertChildResourcesMutable: jest.fn(),
      }
    : undefined;
  const candidateRecord = records.candidate
    ? {
        ...records.candidate,
        belongsToVoteDetail: (voteDetailId: string) =>
          records.candidate?.voteDetailId === voteDetailId,
      }
    : undefined;
  const voteRepository: VoteRepositoryPort = {
    nextId: () => 'vote-id',
    findById: jest.fn().mockResolvedValue(voteRecord),
    save: jest.fn(),
  };
  const voteDetailRepository: VoteDetailRepositoryPort = {
    nextId: () => 'vote-detail-id',
    findById: jest.fn().mockResolvedValue(voteDetailRecord),
    findByVoteIds: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
  };
  const candidateRepository: CandidateRepositoryPort = {
    nextId: () => 'candidate-id',
    findById: jest.fn().mockResolvedValue(candidateRecord),
    save: jest.fn(),
  };

  return new AttachmentTargetValidator(
    voteRepository,
    voteDetailRepository,
    candidateRepository,
  );
}

function voteLifecycleStub(): jest.Mocked<VoteSetupLifecyclePort> {
  return {
    lockVote: jest.fn().mockResolvedValue(undefined),
    lockForBilling: jest.fn(),
    finalizePaidBilling: jest.fn(),
    assertBillingCancellationAllowed: jest.fn(),
    releaseBilling: jest.fn(),
  };
}

function transactionManagerStub(): DatabaseTransactionManager & {
  readonly calls: jest.Mock<
    void,
    [unknown, DatabaseTransactionOptions | undefined]
  >;
} {
  const calls = jest.fn<
    void,
    [unknown, DatabaseTransactionOptions | undefined]
  >();

  return {
    calls,
    runInTransaction<T>(
      work: () => Promise<T>,
      options?: DatabaseTransactionOptions,
    ): Promise<T> {
      calls(work, options);
      return work();
    },
  };
}
