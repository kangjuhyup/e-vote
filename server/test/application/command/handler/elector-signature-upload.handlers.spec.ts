import { ConfirmElectorSignatureUploadCommand } from '../../../../src/modules/elector/application/command/dto/request/confirm-elector-signature-upload.command';
import { RequestElectorSignatureUploadCommand } from '../../../../src/modules/elector/application/command/dto/request/request-elector-signature-upload.command';
import {
  ConfirmElectorSignatureUploadHandler,
  ElectorSignatureMetadataMismatchError,
} from '../../../../src/modules/elector/application/command/handler/confirm-elector-signature-upload.handler';
import { RequestElectorSignatureUploadHandler } from '../../../../src/modules/elector/application/command/handler/request-elector-signature-upload.handler';
import {
  MAX_ELECTOR_SIGNATURE_SIZE_BYTES,
  UnsupportedElectorSignatureMimeTypeError,
} from '../../../../src/modules/elector/application/command/elector-signature-upload.policy';
import type { ElectorSignatureRepositoryPort } from '../../../../src/modules/elector/application/port/persistence/command/elector-signature-repository.port';
import { ElectorParticipantForbiddenError } from '../../../../src/shared/application/port/capability/elector-participant-access.port';
import type { StoragePort } from '../../../../src/shared/application/port/gateway/storage.port';
import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';

describe('elector signature upload handlers', () => {
  let storage: jest.Mocked<StoragePort>;
  let participantAccess: { isAuthorized: jest.Mock };
  let repository: jest.Mocked<ElectorSignatureRepositoryPort>;
  let transactionManager: jest.Mocked<DatabaseTransactionManager>;

  beforeEach(() => {
    storage = {
      createPresignedPutObjectUrl: jest.fn().mockResolvedValue({
        storageKey: 'signatures/opaque-key',
        url: 'https://storage.example/upload',
        expiresAt: new Date('2026-09-06T03:05:00.000Z'),
      }),
      createPresignedGetObjectUrl: jest.fn(),
      createPresignedDeleteObjectUrl: jest.fn(),
      getObjectMetadata: jest.fn(),
    };
    participantAccess = { isAuthorized: jest.fn().mockResolvedValue(true) };
    repository = {
      hasConfirmedSignature: jest.fn(),
      save: jest.fn().mockResolvedValue({
        fileId: '66666666-6666-4666-8666-666666666666',
        storageKey: 'signatures/opaque-key',
      }),
    };
    transactionManager = {
      runInTransaction: jest
        .fn()
        .mockImplementation(async (work: () => Promise<unknown>) => work()),
    };
  });

  it('issues an opaque presigned URL for the authenticated elector', async () => {
    const handler = new RequestElectorSignatureUploadHandler(
      storage,
      participantAccess,
    );

    const result = await handler.execute(
      RequestElectorSignatureUploadCommand.of({
        voteId: 'vote-1',
        electorId: 'elector-1',
        userPrincipalId: 'principal-1',
        originalName: 'signature.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
      }),
    );

    expect(participantAccess.isAuthorized).toHaveBeenCalledWith(
      'vote-1',
      'elector-1',
      'principal-1',
    );
    expect(storage.createPresignedPutObjectUrl.mock.calls[0][0]).toEqual({
      contentType: 'image/png',
      contentLength: 1024,
      metadata: {
        purpose: 'elector-participation-signature',
        voteid: 'vote-1',
        electorid: 'elector-1',
      },
    });
    expect(result).toEqual({
      storageKey: 'signatures/opaque-key',
      uploadUrl: 'https://storage.example/upload',
      expiresAt: new Date('2026-09-06T03:05:00.000Z'),
    });
  });

  it('rejects unauthorized electors and non-image uploads before storage I/O', async () => {
    const handler = new RequestElectorSignatureUploadHandler(
      storage,
      participantAccess,
    );
    participantAccess.isAuthorized.mockResolvedValue(false);

    await expect(
      handler.execute(
        RequestElectorSignatureUploadCommand.of({
          voteId: 'vote-1',
          electorId: 'elector-1',
          userPrincipalId: 'other-principal',
          originalName: 'signature.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
        }),
      ),
    ).rejects.toBeInstanceOf(ElectorParticipantForbiddenError);

    await expect(
      handler.execute(
        RequestElectorSignatureUploadCommand.of({
          voteId: 'vote-1',
          electorId: 'elector-1',
          userPrincipalId: 'principal-1',
          originalName: 'signature.pdf',
          mimeType: 'application/pdf',
          sizeBytes: MAX_ELECTOR_SIGNATURE_SIZE_BYTES,
        }),
      ),
    ).rejects.toBeInstanceOf(UnsupportedElectorSignatureMimeTypeError);
    expect(storage.createPresignedPutObjectUrl.mock.calls).toHaveLength(0);
  });

  it('validates the signed object outside a transaction and confirms it atomically', async () => {
    storage.getObjectMetadata.mockResolvedValue({
      storageKey: 'signatures/opaque-key',
      contentType: 'image/png',
      contentLength: 1024,
      metadata: {
        purpose: 'elector-participation-signature',
        voteid: 'vote-1',
        electorid: 'elector-1',
      },
    });
    const handler = new ConfirmElectorSignatureUploadHandler(
      storage,
      participantAccess,
      repository,
      transactionManager,
    );

    const result = await handler.execute(
      ConfirmElectorSignatureUploadCommand.of({
        voteId: 'vote-1',
        electorId: 'elector-1',
        userPrincipalId: 'principal-1',
        storageKey: 'signatures/opaque-key',
        originalName: 'signature.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
      }),
    );

    expect(storage.getObjectMetadata.mock.invocationCallOrder[0]).toBeLessThan(
      transactionManager.runInTransaction.mock.invocationCallOrder[0],
    );
    expect(participantAccess.isAuthorized).toHaveBeenCalledTimes(2);
    expect(repository.save.mock.calls[0][0]).toEqual({
      voteId: 'vote-1',
      electorId: 'elector-1',
      file: {
        storageKey: 'signatures/opaque-key',
        originalName: 'signature.png',
        mimeType: 'image/png',
        sizeBytes: 1024,
        checksum: undefined,
      },
    });
    expect(result).toEqual({
      fileId: '66666666-6666-4666-8666-666666666666',
      storageKey: 'signatures/opaque-key',
    });
  });

  it('rejects a storage key issued for another elector', async () => {
    storage.getObjectMetadata.mockResolvedValue({
      storageKey: 'signatures/opaque-key',
      contentType: 'image/png',
      contentLength: 1024,
      metadata: {
        purpose: 'elector-participation-signature',
        voteid: 'vote-1',
        electorid: 'other-elector',
      },
    });
    const handler = new ConfirmElectorSignatureUploadHandler(
      storage,
      participantAccess,
      repository,
      transactionManager,
    );

    await expect(
      handler.execute(
        ConfirmElectorSignatureUploadCommand.of({
          voteId: 'vote-1',
          electorId: 'elector-1',
          userPrincipalId: 'principal-1',
          storageKey: 'signatures/opaque-key',
          originalName: 'signature.png',
          mimeType: 'image/png',
          sizeBytes: 1024,
        }),
      ),
    ).rejects.toBeInstanceOf(ElectorSignatureMetadataMismatchError);
    expect(transactionManager.runInTransaction.mock.calls).toHaveLength(0);
  });
});
