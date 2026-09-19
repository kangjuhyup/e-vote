import { randomUUID } from 'node:crypto';
import { MikroORM } from '@mikro-orm/postgresql';
import { createDatabaseConfig } from '../../../../src/platform/database/database.config';
import { VoteContentChangeRepositoryAdapter } from '../../../../src/modules/vote/infrastructure/database/repository/command/vote-content-change-repository.adapter';

const describeDatabase =
  process.env.VOTE_CONTENT_CHANGE_DATABASE_TEST === 'true'
    ? describe
    : describe.skip;

describeDatabase('vote content change repository database integration', () => {
  let orm: MikroORM;

  beforeAll(async () => {
    if (process.env.DATABASE_NAME !== 'vote_content_change_verify_20260919') {
      throw new Error(
        'This test requires the dedicated vote_content_change_verify_20260919 database',
      );
    }
    orm = await MikroORM.init(await createDatabaseConfig());
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it('submits a sealed document and atomically applies approved fields and attachments with audit history', async () => {
    const rollback = new Error('rollback verification fixture');
    await expect(
      orm.em.fork().transactional(async (em) => {
        const repository = new VoteContentChangeRepositoryAdapter(em);
        const commissionId = randomUUID();
        const voteId = randomUUID();
        const voteDetailId = randomUUID();
        const candidateId = randomUUID();
        const documentId = randomUUID();
        const attachmentFileId = randomUUID();
        const candidateFileId = randomUUID();
        const originalFileId = randomUUID();
        const originalAttachmentId = randomUUID();
        const now = new Date();
        const startedAt = new Date(now.getTime() - 60_000);
        const endedAt = new Date(now.getTime() + 86_400_000);
        const proposedEnd = new Date(now.getTime() + 172_800_000);
        await em.getConnection().execute(
          `insert into election_commissions (id, name, status, created_at, updated_at)
         values (?, 'Content change test', 'ACTIVE', ?, ?)`,
          [commissionId, now, now],
          'all',
          em.getTransactionContext<object>(),
        );
        await em.getConnection().execute(
          `insert into votes (id, commission_id, created_by_user_principal_id, tenant_id,
         organization_group_id, organization_group_code, title, description,
         default_privacy_mode, default_participation_unit, default_result_storage_mode,
         default_vote_weight_mode, identity_verification_required, status,
         started_at, ended_at, created_at, updated_at)
         values (?, ?, 'creator', 'tenant', 'group', 'group-code', 'Before', 'Old notice',
         'SECRET', 'INDIVIDUAL', 'DATABASE', 'EQUAL', false, 'OPEN', ?, ?, ?, ?)`,
          [voteId, commissionId, startedAt, endedAt, now, now],
          'all',
          em.getTransactionContext<object>(),
        );
        await em.getConnection().execute(
          `insert into vote_details (id, vote_id, title, description, type, sort_order, status, created_at, updated_at)
           values (?, ?, 'Detail', '', 'CANDIDATE', 0, 'OPEN', ?, ?)`,
          [voteDetailId, voteId, now, now],
          'all',
          em.getTransactionContext<object>(),
        );
        await em.getConnection().execute(
          `insert into candidates (id, vote_detail_id, candidate_no, name, description, status, created_at, updated_at)
           values (?, ?, 1, 'Candidate', '', 'ACTIVE', ?, ?)`,
          [candidateId, voteDetailId, now, now],
          'all',
          em.getTransactionContext<object>(),
        );
        await em.getConnection().execute(
          `insert into files (id, storage_key, original_name, mime_type, size_bytes, checksum, status, created_at)
           values (?, ?, 'old.pdf', 'application/pdf', 100, 'old-checksum', 'ACTIVE', ?)`,
          [originalFileId, `content-change/${originalFileId}`, now],
          'all',
          em.getTransactionContext<object>(),
        );
        await em.getConnection().execute(
          `insert into vote_attachments (id, vote_id, file_id, type, sort_order, created_at)
           values (?, ?, ?, 'NOTICE', 0, ?)`,
          [originalAttachmentId, voteId, originalFileId, now],
          'all',
          em.getTransactionContext<object>(),
        );
        for (const [id, kind, name, type, order] of [
          [documentId, 'DOCUMENT', 'sealed.pdf', undefined, undefined],
          [attachmentFileId, 'VOTE_ATTACHMENT', 'new.pdf', 'NOTICE', 0],
        ] as const) {
          await repository.stageFile({
            id,
            voteId,
            ownerUserPrincipalId: 'creator',
            kind,
            ...(type ? { attachmentType: type } : {}),
            ...(order !== undefined ? { sortOrder: order } : {}),
            storageKey: `content-change/${id}`,
            originalName: name,
            mimeType: 'application/pdf',
            sizeBytes: 100,
          });
          await repository.confirmFile(id, `etag-${id}`);
        }
        await repository.stageFile({
          id: candidateFileId,
          voteId,
          ownerUserPrincipalId: 'creator',
          kind: 'CANDIDATE_ATTACHMENT',
          candidateId,
          attachmentType: 'PLEDGE',
          sortOrder: 0,
          storageKey: `content-change/${candidateFileId}`,
          originalName: 'pledge.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 100,
        });
        await repository.confirmFile(candidateFileId);
        const request = await repository.submit({
          voteId,
          tenantId: 'tenant',
          userPrincipalId: 'creator',
          reason: 'Sealed official request',
          documentFileId: documentId,
          proposal: {
            title: 'After',
            description: 'New notice',
            endedAt: proposedEnd.toISOString(),
            attachmentChanges: [
              { action: 'REMOVE', attachmentId: originalAttachmentId },
              { action: 'ADD', fileId: attachmentFileId },
              { action: 'ADD', fileId: candidateFileId },
            ],
          },
          submittedAt: now,
        });
        expect(request.status).toBe('PENDING');
        expect(request.files).toHaveLength(3);
        expect((await repository.findVote(voteId))?.title).toBe('Before');
        const approved = await repository.review({
          requestId: request.id,
          tenantId: 'tenant',
          reviewerId: 'admin',
          decision: 'APPROVED',
          reviewedAt: new Date(now.getTime() + 1_000),
        });
        expect(approved.status).toBe('APPROVED');
        expect(
          (
            await repository.review({
              requestId: request.id,
              tenantId: 'tenant',
              reviewerId: 'admin',
              decision: 'APPROVED',
              reviewedAt: new Date(now.getTime() + 1_500),
            })
          ).status,
        ).toBe('APPROVED');
        await expect(
          repository.review({
            requestId: request.id,
            tenantId: 'tenant',
            reviewerId: 'admin',
            decision: 'REJECTED',
            reason: 'Late rejection',
            reviewedAt: new Date(now.getTime() + 1_600),
          }),
        ).rejects.toThrow('already been reviewed');
        expect((await repository.findVote(voteId))?.title).toBe('After');
        expect((await repository.findVote(voteId))?.description).toBe(
          'New notice',
        );
        expect((await repository.findVote(voteId))?.endedAt.toISOString()).toBe(
          proposedEnd.toISOString(),
        );
        const attachments = await em
          .getConnection()
          .execute<Array<{ file_name: string }>>(
            `select f.original_name as file_name from vote_attachments a join files f on f.id = a.file_id where a.vote_id = ?`,
            [voteId],
            'all',
            em.getTransactionContext<object>(),
          );
        expect(attachments).toEqual([{ file_name: 'new.pdf' }]);
        const candidateAttachments = await em
          .getConnection()
          .execute<Array<{ file_name: string }>>(
            `select f.original_name as file_name from candidate_attachments a join files f on f.id = a.file_id where a.candidate_id = ?`,
            [candidateId],
            'all',
            em.getTransactionContext<object>(),
          );
        expect(candidateAttachments).toEqual([{ file_name: 'pledge.pdf' }]);
        const histories = await em
          .getConnection()
          .execute<Array<{ change_request_id: string }>>(
            'select change_request_id from vote_content_change_histories where vote_id = ?',
            [voteId],
            'all',
            em.getTransactionContext<object>(),
          );
        expect(histories).toHaveLength(6);
        const [removalHistory] = await em
          .getConnection()
          .execute<
            Array<{ old_value: { fileName: string; checksum: string } }>
          >(
            `select old_value from vote_content_change_histories where vote_id = ? and target_type = 'VOTE_ATTACHMENT' and action = 'DELETED'`,
            [voteId],
            'all',
            em.getTransactionContext<object>(),
          );
        expect(removalHistory.old_value).toEqual(
          expect.objectContaining({
            fileName: 'old.pdf',
            checksum: 'old-checksum',
          }),
        );
        expect(
          histories.every(
            (history) => history.change_request_id === request.id,
          ),
        ).toBe(true);
        const secondDocumentId = randomUUID();
        await repository.stageFile({
          id: secondDocumentId,
          voteId,
          ownerUserPrincipalId: 'creator',
          kind: 'DOCUMENT',
          storageKey: `content-change/${secondDocumentId}`,
          originalName: 'second-sealed.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 100,
        });
        await repository.confirmFile(secondDocumentId);
        const secondRequest = await repository.submit({
          voteId,
          tenantId: 'tenant',
          userPrincipalId: 'creator',
          reason: 'Second official request',
          documentFileId: secondDocumentId,
          proposal: { title: 'Another title', attachmentChanges: [] },
          submittedAt: new Date(now.getTime() + 2_000),
        });
        await em
          .getConnection()
          .execute(
            "update votes set status = 'CLOSED' where id = ?",
            [voteId],
            'all',
            em.getTransactionContext<object>(),
          );
        const invalidated = await repository.review({
          requestId: secondRequest.id,
          tenantId: 'tenant',
          reviewerId: 'admin',
          decision: 'APPROVED',
          reviewedAt: new Date(now.getTime() + 3_000),
        });
        expect(invalidated.status).toBe('INVALIDATED');
        expect((await repository.findVote(voteId))?.title).toBe('After');
        throw rollback;
      }),
    ).rejects.toThrow(rollback.message);
  });
});
