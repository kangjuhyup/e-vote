/* eslint-disable @typescript-eslint/unbound-method */
import { UserPrincipal } from '../../../src/shared/application/security/user-principal';
import type { StoragePort } from '../../../src/shared/application/port/gateway/storage.port';
import type { DatabaseTransactionManager } from '../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';
import type { VoteContentChangeRepositoryPort } from '../../../src/modules/vote/application/port/persistence/command/vote-content-change-repository.port';
import {
  VoteContentChangeAccessDeniedError,
  VoteContentChangeWorkflow,
} from '../../../src/modules/vote/application/command/vote-content-change.workflow';

const owner = UserPrincipal.of({ id: 'creator', tenantId: 'tenant' });
const outsider = UserPrincipal.of({ id: 'other', tenantId: 'tenant' });
const admin = UserPrincipal.of({
  id: 'admin',
  tenantId: 'tenant',
  scopes: ['tenant_roles'],
  tenantRoles: [{ id: 'role', code: 'vote-admin' }],
});
const foreignAdmin = UserPrincipal.of({
  id: 'admin-elsewhere',
  tenantId: 'elsewhere',
  scopes: ['tenant_roles'],
  tenantRoles: [{ id: 'role', code: 'vote-admin' }],
});

describe('VoteContentChangeWorkflow', () => {
  const vote = {
    id: 'vote',
    tenantId: 'tenant',
    createdByUserPrincipalId: 'creator',
    status: 'OPEN',
    startedAt: new Date(Date.now() - 60_000),
    endedAt: new Date(Date.now() + 86_400_000),
    title: 'Before',
    description: 'Notice',
  };
  const documentFile = {
    id: 'document',
    voteId: 'vote',
    ownerUserPrincipalId: 'creator',
    kind: 'DOCUMENT' as const,
    storageKey: 'sealed-document',
    originalName: 'sealed.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 100,
    confirmedAt: new Date(),
    requestId: 'request',
  };
  const request = {
    id: 'request',
    voteId: 'vote',
    tenantId: 'tenant',
    submittedByUserPrincipalId: 'creator',
    status: 'PENDING' as const,
    reason: 'Official request',
    documentFileId: 'document',
    proposal: { title: 'After', attachmentChanges: [] },
    snapshot: {
      title: 'Before',
      description: 'Notice',
      endedAt: vote.endedAt.toISOString(),
      attachments: [],
    },
    submittedAt: new Date(),
  };
  let repository: jest.Mocked<VoteContentChangeRepositoryPort>;
  let storage: jest.Mocked<StoragePort>;
  let workflow: VoteContentChangeWorkflow;

  beforeEach(() => {
    repository = {
      findVote: jest.fn().mockResolvedValue(vote),
      stageFile: jest.fn(),
      findFile: jest.fn().mockResolvedValue(documentFile),
      confirmFile: jest.fn(),
      submit: jest.fn().mockResolvedValue(request),
      findRequest: jest.fn().mockResolvedValue(request),
      listByVote: jest.fn().mockResolvedValue([request]),
      listByTenant: jest.fn().mockResolvedValue([request]),
      review: jest.fn().mockResolvedValue({ ...request, status: 'APPROVED' }),
    };
    storage = {
      createPresignedPutObjectUrl: jest.fn().mockResolvedValue({
        storageKey: 'key',
        url: 'https://example.test/put',
        expiresAt: new Date(),
      }),
      createPresignedGetObjectUrl: jest.fn().mockResolvedValue({
        storageKey: 'key',
        url: 'https://example.test/get',
        expiresAt: new Date(),
      }),
      createPresignedDeleteObjectUrl: jest.fn(),
      getObjectMetadata: jest.fn(),
      deleteObject: jest.fn(),
    };
    const transactions = {
      runInTransaction: jest
        .fn()
        .mockImplementation(async (operation: () => Promise<unknown>) =>
          operation(),
        ),
    } as unknown as DatabaseTransactionManager;
    workflow = new VoteContentChangeWorkflow(repository, storage, transactions);
  });

  it('requires vote ownership for submission and restricts admin lists to their tenant', async () => {
    await expect(
      workflow.submit(outsider, {
        voteId: 'vote',
        reason: 'reason',
        documentFileId: 'document',
        proposal: { title: 'After', attachmentChanges: [] },
      }),
    ).rejects.toBeInstanceOf(VoteContentChangeAccessDeniedError);
    expect(repository.submit).not.toHaveBeenCalled();
    await expect(workflow.listForAdmin(outsider)).rejects.toBeInstanceOf(
      VoteContentChangeAccessDeniedError,
    );
    await workflow.listForAdmin(admin);
    expect(repository.listByTenant).toHaveBeenCalledWith('tenant');
  });

  it('keeps sealed documents private to the creator and same-tenant admin', async () => {
    await expect(
      workflow.getFileDownload(outsider, 'vote', 'document'),
    ).rejects.toBeInstanceOf(VoteContentChangeAccessDeniedError);
    await expect(
      workflow.getFileDownload(foreignAdmin, 'vote', 'document'),
    ).rejects.toBeInstanceOf(VoteContentChangeAccessDeniedError);
    expect(
      (await workflow.getFileDownload(owner, 'vote', 'document')).downloadUrl,
    ).toContain('/get');
    expect(
      (await workflow.getFileDownload(admin, 'vote', 'document')).downloadUrl,
    ).toContain('/get');
  });

  it('verifies uploaded object metadata before confirming a sealed document', async () => {
    repository.findFile.mockResolvedValue({
      ...documentFile,
      requestId: undefined,
    });
    storage.getObjectMetadata.mockResolvedValue({
      storageKey: 'sealed-document',
      contentType: 'application/pdf',
      contentLength: 100,
      metadata: {
        voteid: 'wrong-vote',
        owneruserprincipalid: 'creator',
        kind: 'DOCUMENT',
      },
    });
    await expect(
      workflow.confirmFile(owner, 'vote', 'document'),
    ).rejects.toThrow();
    expect(repository.confirmFile).not.toHaveBeenCalled();
    storage.getObjectMetadata.mockResolvedValue({
      storageKey: 'sealed-document',
      contentType: 'application/pdf',
      contentLength: 100,
      eTag: 'etag',
      metadata: {
        voteid: 'vote',
        owneruserprincipalid: 'creator',
        kind: 'DOCUMENT',
      },
    });
    await workflow.confirmFile(owner, 'vote', 'document');
    expect(repository.confirmFile).toHaveBeenCalledWith('document', 'etag');
  });

  it('allows only same-tenant admins to approve', async () => {
    await expect(
      workflow.review(outsider, { requestId: 'request', decision: 'APPROVED' }),
    ).rejects.toBeInstanceOf(VoteContentChangeAccessDeniedError);
    await workflow.review(admin, {
      requestId: 'request',
      decision: 'APPROVED',
    });
    expect(repository.review).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request',
        tenantId: 'tenant',
        reviewerId: 'admin',
        decision: 'APPROVED',
      }),
    );
  });
});
