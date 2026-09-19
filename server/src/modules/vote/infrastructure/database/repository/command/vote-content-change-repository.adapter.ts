import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  VoteContentChangeFile,
  VoteContentChangeRepositoryPort,
  VoteContentChangeRequest,
} from '../../../../application/port/persistence/command/vote-content-change-repository.port';
import {
  VoteContentChangePolicy,
  type VoteContentChangeProposal,
} from '../../../../domain/vote/vote-content-change.policy';
import { DomainError } from '../../../../../../shared/domain/domain-error';

type VoteRow = {
  id: string;
  tenant_id: string | null;
  created_by_user_principal_id: string | null;
  status: string;
  started_at: Date;
  ended_at: Date;
  title: string;
  description: string;
};
type FileRow = {
  id: string;
  vote_id: string;
  owner_user_principal_id: string;
  kind: VoteContentChangeFile['kind'];
  candidate_id: string | null;
  attachment_type: string | null;
  sort_order: number | null;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  checksum: string | null;
  confirmed_at: Date | null;
  request_id: string | null;
};
type RequestRow = {
  id: string;
  vote_id: string;
  tenant_id: string;
  submitted_by_user_principal_id: string;
  status: VoteContentChangeRequest['status'];
  reason: string;
  document_file_id: string;
  proposal: VoteContentChangeProposal;
  snapshot: VoteContentChangeRequest['snapshot'];
  submitted_at: Date;
  reviewed_by_user_principal_id: string | null;
  reviewed_at: Date | null;
  review_reason: string | null;
};
type AttachmentRow = {
  id: string;
  kind: 'VOTE_ATTACHMENT' | 'CANDIDATE_ATTACHMENT';
  candidate_id: string | null;
  original_name: string;
  type: string;
};

@Injectable()
export class VoteContentChangeRepositoryAdapter implements VoteContentChangeRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  private async rows<T extends object>(
    sql: string,
    values: unknown[] = [],
  ): Promise<T[]> {
    const em = this.em.getContext();
    return em
      .getConnection()
      .execute<T[]>(sql, values, 'all', em.getTransactionContext<object>());
  }

  async findVote(voteId: string) {
    const [vote] = await this.rows<VoteRow>(
      'select id, tenant_id, created_by_user_principal_id, status, started_at, ended_at, title, description from votes where id = ?',
      [voteId],
    );
    return vote
      ? {
          id: vote.id,
          tenantId: vote.tenant_id ?? undefined,
          createdByUserPrincipalId:
            vote.created_by_user_principal_id ?? undefined,
          status: vote.status,
          startedAt: new Date(vote.started_at),
          endedAt: new Date(vote.ended_at),
          title: vote.title,
          description: vote.description,
        }
      : undefined;
  }

  async stageFile(file: VoteContentChangeFile): Promise<void> {
    if (file.kind === 'CANDIDATE_ATTACHMENT') {
      const candidate = await this.rows<{ id: string }>(
        'select c.id from candidates c join vote_details d on d.id = c.vote_detail_id where c.id = ? and d.vote_id = ?',
        [file.candidateId, file.voteId],
      );
      if (candidate.length === 0)
        throw new DomainError('candidate does not belong to vote');
    }
    await this.rows(
      `insert into vote_content_change_files
       (id, vote_id, owner_user_principal_id, kind, candidate_id, attachment_type, sort_order,
        storage_key, original_name, mime_type, size_bytes, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())`,
      [
        file.id,
        file.voteId,
        file.ownerUserPrincipalId,
        file.kind,
        file.candidateId ?? null,
        file.attachmentType ?? null,
        file.sortOrder ?? null,
        file.storageKey,
        file.originalName,
        file.mimeType,
        file.sizeBytes,
      ],
    );
  }

  async findFile(fileId: string): Promise<VoteContentChangeFile | undefined> {
    const [file] = await this.rows<FileRow>(
      'select * from vote_content_change_files where id = ?',
      [fileId],
    );
    return file ? this.mapFile(file) : undefined;
  }

  async confirmFile(fileId: string, checksum?: string): Promise<void> {
    await this.rows(
      'update vote_content_change_files set confirmed_at = coalesce(confirmed_at, now()), checksum = coalesce(checksum, ?) where id = ? and request_id is null',
      [checksum ?? null, fileId],
    );
  }

  async submit(input: {
    voteId: string;
    tenantId: string;
    userPrincipalId: string;
    reason: string;
    documentFileId: string;
    proposal: VoteContentChangeProposal;
    submittedAt: Date;
  }): Promise<VoteContentChangeRequest> {
    const [vote] = await this.rows<VoteRow>(
      'select id, tenant_id, created_by_user_principal_id, status, started_at, ended_at, title, description from votes where id = ? for update',
      [input.voteId],
    );
    if (
      !vote ||
      vote.tenant_id !== input.tenantId ||
      vote.created_by_user_principal_id !== input.userPrincipalId
    ) {
      throw new DomainError(
        'vote content change is not available to this user',
      );
    }
    VoteContentChangePolicy.assertOpen(
      vote.status,
      new Date(vote.ended_at),
      input.submittedAt,
    );
    const proposal = VoteContentChangePolicy.normalizeProposal(
      input.proposal,
      new Date(vote.started_at),
      input.submittedAt,
    );
    if (
      (proposal.title === undefined || proposal.title === vote.title) &&
      (proposal.description === undefined ||
        proposal.description === vote.description) &&
      (proposal.endedAt === undefined ||
        proposal.endedAt === new Date(vote.ended_at).toISOString()) &&
      proposal.attachmentChanges.length === 0
    ) {
      throw new DomainError('content change must alter the vote');
    }
    const [pending] = await this.rows<{ id: string }>(
      `select id from vote_content_change_requests where vote_id = ? and status = 'PENDING'`,
      [input.voteId],
    );
    if (pending)
      throw new DomainError('vote already has a pending content change');

    const [document] = await this.rows<FileRow>(
      'select * from vote_content_change_files where id = ? for update',
      [input.documentFileId],
    );
    this.assertUsableFile(
      document,
      input.voteId,
      input.userPrincipalId,
      'DOCUMENT',
    );

    for (const change of proposal.attachmentChanges) {
      if (change.action === 'ADD') {
        const [file] = await this.rows<FileRow>(
          'select * from vote_content_change_files where id = ? for update',
          [change.fileId],
        );
        this.assertUsableFile(file, input.voteId, input.userPrincipalId);
        if (file.kind === 'DOCUMENT')
          throw new DomainError('document cannot be a vote attachment');
      } else {
        const [attachment] = await this.rows<{ id: string }>(
          `select va.id from vote_attachments va where va.id = ? and va.vote_id = ?
           union all
           select ca.id from candidate_attachments ca
           join candidates c on c.id = ca.candidate_id
           join vote_details d on d.id = c.vote_detail_id
           where ca.id = ? and d.vote_id = ?`,
          [
            change.attachmentId,
            input.voteId,
            change.attachmentId,
            input.voteId,
          ],
        );
        if (!attachment)
          throw new DomainError('attachment does not belong to vote');
      }
    }

    const id = randomUUID();
    const attachments = await this.currentAttachments(input.voteId);
    const snapshot = {
      title: vote.title,
      description: vote.description,
      endedAt: new Date(vote.ended_at).toISOString(),
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        kind: attachment.kind,
        ...(attachment.candidate_id
          ? { candidateId: attachment.candidate_id }
          : {}),
        fileName: attachment.original_name,
        attachmentType: attachment.type,
      })),
    };
    await this.rows(
      `insert into vote_content_change_requests
       (id, vote_id, tenant_id, submitted_by_user_principal_id, status, reason,
        document_file_id, proposal, snapshot, submitted_at)
       values (?, ?, ?, ?, 'PENDING', ?, ?, ?::jsonb, ?::jsonb, ?)`,
      [
        id,
        input.voteId,
        input.tenantId,
        input.userPrincipalId,
        input.reason,
        input.documentFileId,
        JSON.stringify(proposal),
        JSON.stringify(snapshot),
        input.submittedAt,
      ],
    );
    const stagedIds = [
      input.documentFileId,
      ...proposal.attachmentChanges
        .filter(
          (change): change is { action: 'ADD'; fileId: string } =>
            change.action === 'ADD',
        )
        .map((change) => change.fileId),
    ];
    for (const fileId of stagedIds) {
      await this.rows(
        'update vote_content_change_files set request_id = ? where id = ? and request_id is null',
        [id, fileId],
      );
    }
    return (await this.findRequest(id))!;
  }

  async findRequest(
    requestId: string,
  ): Promise<VoteContentChangeRequest | undefined> {
    const [request] = await this.rows<RequestRow>(
      'select * from vote_content_change_requests where id = ?',
      [requestId],
    );
    return request ? (await this.withFiles([request]))[0] : undefined;
  }

  async listByVote(voteId: string): Promise<VoteContentChangeRequest[]> {
    const rows = await this.rows<RequestRow>(
      'select * from vote_content_change_requests where vote_id = ? order by submitted_at desc limit 100',
      [voteId],
    );
    return this.withFiles(rows);
  }

  async listByTenant(tenantId: string): Promise<VoteContentChangeRequest[]> {
    const rows = await this.rows<RequestRow>(
      'select * from vote_content_change_requests where tenant_id = ? order by submitted_at desc limit 100',
      [tenantId],
    );
    return this.withFiles(rows);
  }

  async review(input: {
    requestId: string;
    tenantId: string;
    reviewerId: string;
    decision: 'APPROVED' | 'REJECTED';
    reason?: string;
    reviewedAt: Date;
  }): Promise<VoteContentChangeRequest> {
    const [requestInfo] = await this.rows<RequestRow>(
      'select * from vote_content_change_requests where id = ?',
      [input.requestId],
    );
    if (!requestInfo || requestInfo.tenant_id !== input.tenantId) {
      throw new DomainError('content change request not found');
    }
    const [vote] = await this.rows<VoteRow>(
      'select id, tenant_id, created_by_user_principal_id, status, started_at, ended_at, title, description from votes where id = ? for update',
      [requestInfo.vote_id],
    );
    const [request] = await this.rows<RequestRow>(
      'select * from vote_content_change_requests where id = ? for update',
      [input.requestId],
    );
    if (!request || !vote)
      throw new DomainError('content change request not found');
    if (request.status === input.decision) return this.mapRequest(request);
    if (request.status !== 'PENDING') {
      throw new DomainError('content change request has already been reviewed');
    }
    if (input.decision === 'REJECTED') {
      if (!input.reason?.trim())
        throw new DomainError('rejection reason is required');
      await this.setReview(
        request.id,
        'REJECTED',
        input.reviewerId,
        input.reviewedAt,
        input.reason.trim(),
      );
      return (await this.findRequest(request.id))!;
    }

    const snapshot = request.snapshot;
    const stale =
      vote.status !== 'OPEN' ||
      new Date(vote.ended_at).getTime() <= input.reviewedAt.getTime() ||
      (request.proposal.endedAt !== undefined &&
        new Date(request.proposal.endedAt).getTime() <=
          input.reviewedAt.getTime()) ||
      vote.title !== snapshot.title ||
      vote.description !== snapshot.description ||
      new Date(vote.ended_at).toISOString() !== snapshot.endedAt;
    const currentAttachmentIds = (await this.currentAttachments(vote.id))
      .map((attachment) => attachment.id)
      .sort();
    const originalAttachmentIds = (snapshot.attachments ?? [])
      .map((attachment) => attachment.id)
      .sort();
    if (
      stale ||
      JSON.stringify(currentAttachmentIds) !==
        JSON.stringify(originalAttachmentIds)
    ) {
      await this.setReview(
        request.id,
        'INVALIDATED',
        input.reviewerId,
        input.reviewedAt,
        '투표가 종료되었거나 제출 당시의 내용과 달라 적용할 수 없습니다.',
      );
      return (await this.findRequest(request.id))!;
    }
    const proposal = VoteContentChangePolicy.normalizeProposal(
      request.proposal,
      new Date(vote.started_at),
      input.reviewedAt,
    );
    const title = proposal.title ?? vote.title;
    const description = proposal.description ?? vote.description;
    const endedAt = proposal.endedAt
      ? new Date(proposal.endedAt)
      : new Date(vote.ended_at);
    await this.rows(
      'update votes set title = ?, description = ?, ended_at = ?, updated_at = ? where id = ?',
      [title, description, endedAt, input.reviewedAt, vote.id],
    );
    for (const [field, oldValue, newValue] of [
      ['title', vote.title, title],
      ['description', vote.description, description],
      ['endedAt', new Date(vote.ended_at).toISOString(), endedAt.toISOString()],
    ]) {
      if (oldValue !== newValue) {
        await this.insertHistory(
          request,
          input,
          'VOTE',
          'UPDATED',
          field,
          oldValue,
          newValue,
        );
      }
    }
    for (const change of proposal.attachmentChanges) {
      if (change.action === 'REMOVE') {
        await this.removeAttachment(request, input, change.attachmentId);
      } else {
        await this.addAttachment(request, input, change.fileId);
      }
    }
    await this.setReview(
      request.id,
      'APPROVED',
      input.reviewerId,
      input.reviewedAt,
      null,
    );
    return (await this.findRequest(request.id))!;
  }

  private async removeAttachment(
    request: RequestRow,
    input: { reviewerId: string; reviewedAt: Date },
    attachmentId: string,
  ): Promise<void> {
    const [voteAttachment] = await this.rows<{ id: string; file_id: string }>(
      'delete from vote_attachments where id = ? and vote_id = ? returning id, file_id',
      [attachmentId, request.vote_id],
    );
    if (voteAttachment) {
      const file = await this.canonicalFileMetadata(voteAttachment.file_id);
      await this.insertHistory(
        request,
        input,
        'VOTE_ATTACHMENT',
        'DELETED',
        null,
        { attachmentId, fileId: voteAttachment.file_id, ...file },
        null,
      );
      return;
    }
    const [candidateAttachment] = await this.rows<{
      id: string;
      file_id: string;
      candidate_id: string;
    }>(
      `delete from candidate_attachments where id = ? and candidate_id in (
        select c.id from candidates c join vote_details d on d.id = c.vote_detail_id where d.vote_id = ?
      ) returning id, file_id, candidate_id`,
      [attachmentId, request.vote_id],
    );
    if (!candidateAttachment)
      throw new DomainError('attachment changed before approval');
    const file = await this.canonicalFileMetadata(candidateAttachment.file_id);
    await this.insertHistory(
      request,
      input,
      'CANDIDATE_ATTACHMENT',
      'DELETED',
      null,
      {
        attachmentId,
        fileId: candidateAttachment.file_id,
        candidateId: candidateAttachment.candidate_id,
        ...file,
      },
      null,
    );
  }

  private async canonicalFileMetadata(fileId: string) {
    const [file] = await this.rows<{
      original_name: string;
      checksum: string | null;
    }>('select original_name, checksum from files where id = ?', [fileId]);
    return {
      fileName: file?.original_name,
      checksum: file?.checksum ?? null,
    };
  }

  private async addAttachment(
    request: RequestRow,
    input: { reviewerId: string; reviewedAt: Date },
    fileId: string,
  ): Promise<void> {
    const [file] = await this.rows<FileRow>(
      'select * from vote_content_change_files where id = ? and request_id = ? and confirmed_at is not null',
      [fileId, request.id],
    );
    if (!file || file.vote_id !== request.vote_id || file.kind === 'DOCUMENT') {
      throw new DomainError('proposed attachment is unavailable');
    }
    const canonicalFileId = randomUUID();
    const attachmentId = randomUUID();
    await this.rows(
      `insert into files (id, storage_key, original_name, mime_type, size_bytes, checksum, status, created_at, deleted_at)
       values (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, null)`,
      [
        canonicalFileId,
        file.storage_key,
        file.original_name,
        file.mime_type,
        file.size_bytes,
        file.checksum,
        input.reviewedAt,
      ],
    );
    if (file.kind === 'VOTE_ATTACHMENT') {
      await this.rows(
        'insert into vote_attachments (id, vote_id, file_id, type, sort_order, created_at) values (?, ?, ?, ?, ?, ?)',
        [
          attachmentId,
          request.vote_id,
          canonicalFileId,
          file.attachment_type,
          file.sort_order ?? 0,
          input.reviewedAt,
        ],
      );
    } else {
      await this.rows(
        'insert into candidate_attachments (id, candidate_id, file_id, type, sort_order, created_at) values (?, ?, ?, ?, ?, ?)',
        [
          attachmentId,
          file.candidate_id,
          canonicalFileId,
          file.attachment_type,
          file.sort_order ?? 0,
          input.reviewedAt,
        ],
      );
    }
    await this.insertHistory(
      request,
      input,
      file.kind === 'VOTE_ATTACHMENT'
        ? 'VOTE_ATTACHMENT'
        : 'CANDIDATE_ATTACHMENT',
      'CREATED',
      null,
      null,
      {
        attachmentId,
        fileId: canonicalFileId,
        candidateId: file.candidate_id,
        fileName: file.original_name,
        checksum: file.checksum,
      },
    );
  }

  private async insertHistory(
    request: RequestRow,
    input: { reviewerId: string; reviewedAt: Date },
    targetType: string,
    action: string,
    fieldName: string | null,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void> {
    await this.rows(
      `insert into vote_content_change_histories
       (id, vote_id, target_type, action, field_name, old_value, new_value,
        change_reason, actor_type, actor_id, changed_at, created_at, change_request_id)
       values (?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, 'ADMIN', ?, ?, ?, ?)`,
      [
        randomUUID(),
        request.vote_id,
        targetType,
        action,
        fieldName,
        JSON.stringify(oldValue),
        JSON.stringify(newValue),
        request.reason,
        input.reviewerId,
        input.reviewedAt,
        input.reviewedAt,
        request.id,
      ],
    );
  }

  private async setReview(
    requestId: string,
    status: VoteContentChangeRequest['status'],
    reviewerId: string,
    reviewedAt: Date,
    reason: string | null,
  ): Promise<void> {
    await this.rows(
      'update vote_content_change_requests set status = ?, reviewed_by_user_principal_id = ?, reviewed_at = ?, review_reason = ? where id = ?',
      [status, reviewerId, reviewedAt, reason, requestId],
    );
  }

  private assertUsableFile(
    file: FileRow | undefined,
    voteId: string,
    userId: string,
    kind?: VoteContentChangeFile['kind'],
  ): asserts file is FileRow {
    if (
      !file ||
      file.vote_id !== voteId ||
      file.owner_user_principal_id !== userId ||
      !file.confirmed_at ||
      file.request_id ||
      (kind && file.kind !== kind)
    ) {
      throw new DomainError('confirmed content change file is required');
    }
  }

  private mapFile(row: FileRow): VoteContentChangeFile {
    return {
      id: row.id,
      voteId: row.vote_id,
      ownerUserPrincipalId: row.owner_user_principal_id,
      kind: row.kind,
      ...(row.candidate_id ? { candidateId: row.candidate_id } : {}),
      ...(row.attachment_type ? { attachmentType: row.attachment_type } : {}),
      ...(row.sort_order !== null ? { sortOrder: row.sort_order } : {}),
      storageKey: row.storage_key,
      originalName: row.original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      ...(row.checksum ? { checksum: row.checksum } : {}),
      ...(row.confirmed_at ? { confirmedAt: new Date(row.confirmed_at) } : {}),
      ...(row.request_id ? { requestId: row.request_id } : {}),
    };
  }

  private mapRequest(row: RequestRow): VoteContentChangeRequest {
    return {
      id: row.id,
      voteId: row.vote_id,
      tenantId: row.tenant_id,
      submittedByUserPrincipalId: row.submitted_by_user_principal_id,
      status: row.status,
      reason: row.reason,
      documentFileId: row.document_file_id,
      proposal: row.proposal,
      snapshot: row.snapshot,
      submittedAt: new Date(row.submitted_at),
      ...(row.reviewed_by_user_principal_id
        ? { reviewedByUserPrincipalId: row.reviewed_by_user_principal_id }
        : {}),
      ...(row.reviewed_at ? { reviewedAt: new Date(row.reviewed_at) } : {}),
      ...(row.review_reason ? { reviewReason: row.review_reason } : {}),
    };
  }

  private async currentAttachments(voteId: string): Promise<AttachmentRow[]> {
    return this.rows<AttachmentRow>(
      `select va.id, 'VOTE_ATTACHMENT' as kind, null::uuid as candidate_id,
              f.original_name, va.type
       from vote_attachments va join files f on f.id = va.file_id
       where va.vote_id = ?
       union all
       select ca.id, 'CANDIDATE_ATTACHMENT' as kind, ca.candidate_id,
              f.original_name, ca.type
       from candidate_attachments ca join files f on f.id = ca.file_id
       join candidates c on c.id = ca.candidate_id
       join vote_details d on d.id = c.vote_detail_id
       where d.vote_id = ?`,
      [voteId, voteId],
    );
  }

  private async withFiles(
    rows: RequestRow[],
  ): Promise<VoteContentChangeRequest[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const files = await this.rows<FileRow>(
      `select * from vote_content_change_files where request_id in (${ids.map(() => '?').join(', ')})`,
      ids,
    );
    const byRequest = new Map<string, VoteContentChangeRequest['files']>();
    for (const file of files) {
      const list = byRequest.get(file.request_id!) ?? [];
      list.push({
        id: file.id,
        kind: file.kind,
        ...(file.candidate_id ? { candidateId: file.candidate_id } : {}),
        ...(file.attachment_type
          ? { attachmentType: file.attachment_type }
          : {}),
        originalName: file.original_name,
        mimeType: file.mime_type,
        sizeBytes: file.size_bytes,
      });
      byRequest.set(file.request_id!, list);
    }
    return rows.map((row) => ({
      ...this.mapRequest(row),
      files: byRequest.get(row.id) ?? [],
    }));
  }
}
