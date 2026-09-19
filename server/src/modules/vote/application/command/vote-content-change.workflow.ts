import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { UserPrincipal } from '../../../../shared/application/security/user-principal';
import {
  STORAGE_PORT,
  type StoragePort,
} from '../../../../shared/application/port/gateway/storage.port';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import { DomainError } from '../../../../shared/domain/domain-error';
import {
  VOTE_CONTENT_CHANGE_REPOSITORY_PORT,
  type VoteContentChangeFileKind,
  type VoteContentChangeRepositoryPort,
} from '../port/persistence/command/vote-content-change-repository.port';
import type { VoteContentChangeProposal } from '../../domain/vote/vote-content-change.policy';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const DOCUMENT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ATTACHMENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const VOTE_ATTACHMENT_TYPES = new Set(['NOTICE', 'GUIDE', 'ETC']);
const CANDIDATE_ATTACHMENT_TYPES = new Set([
  'PROFILE_IMAGE',
  'PLEDGE',
  'POSTER',
  'ETC',
]);

export class VoteContentChangeAccessDeniedError extends Error {}
export class VoteContentChangeNotFoundError extends Error {}

@Injectable()
export class VoteContentChangeWorkflow {
  constructor(
    @Inject(VOTE_CONTENT_CHANGE_REPOSITORY_PORT)
    private readonly repository: VoteContentChangeRepositoryPort,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    private readonly transactions: DatabaseTransactionManager,
  ) {}

  private async requireOwner(voteId: string, user: UserPrincipal) {
    const vote = await this.repository.findVote(voteId);
    if (!vote) throw new VoteContentChangeNotFoundError();
    if (
      vote.createdByUserPrincipalId !== user.id ||
      vote.tenantId !== user.tenantId
    ) {
      throw new VoteContentChangeAccessDeniedError();
    }
    return vote;
  }

  private requireAdmin(user: UserPrincipal): string {
    if (!user.tenantId || !user.hasTenantRole('vote-admin')) {
      throw new VoteContentChangeAccessDeniedError();
    }
    return user.tenantId;
  }

  async requestFileUpload(
    user: UserPrincipal,
    input: {
      voteId: string;
      kind: VoteContentChangeFileKind;
      candidateId?: string;
      attachmentType?: string;
      sortOrder?: number;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
    },
  ) {
    const vote = await this.requireOwner(input.voteId, user);
    if (vote.status !== 'OPEN' || vote.endedAt.getTime() <= Date.now()) {
      throw new DomainError('only open votes can request content changes');
    }
    const mimeType = input.mimeType.trim().toLowerCase().split(';')[0] ?? '';
    if (
      !input.originalName.trim() ||
      input.originalName.length > 255 ||
      !Number.isInteger(input.sizeBytes) ||
      input.sizeBytes < 1 ||
      input.sizeBytes > MAX_FILE_SIZE
    ) {
      throw new DomainError('invalid content change file metadata');
    }
    if (input.kind === 'DOCUMENT') {
      if (
        !DOCUMENT_TYPES.has(mimeType) ||
        input.candidateId ||
        input.attachmentType
      ) {
        throw new DomainError('document must be a PDF, JPEG, or PNG file');
      }
    } else {
      const types =
        input.kind === 'VOTE_ATTACHMENT'
          ? VOTE_ATTACHMENT_TYPES
          : CANDIDATE_ATTACHMENT_TYPES;
      if (
        !ATTACHMENT_TYPES.has(mimeType) ||
        !input.attachmentType ||
        !types.has(input.attachmentType) ||
        (input.kind === 'CANDIDATE_ATTACHMENT' && !input.candidateId) ||
        (input.kind === 'VOTE_ATTACHMENT' && input.candidateId) ||
        !Number.isInteger(input.sortOrder) ||
        (input.sortOrder ?? -1) < 0
      ) {
        throw new DomainError('invalid proposed attachment');
      }
    }
    const metadata = {
      voteId: input.voteId,
      ownerUserPrincipalId: user.id,
      kind: input.kind,
      ...(input.candidateId ? { candidateId: input.candidateId } : {}),
    };
    const grant = await this.storage.createPresignedPutObjectUrl({
      contentType: mimeType,
      contentLength: input.sizeBytes,
      metadata,
    });
    const fileId = randomUUID();
    await this.repository.stageFile({
      id: fileId,
      voteId: input.voteId,
      ownerUserPrincipalId: user.id,
      kind: input.kind,
      ...(input.candidateId ? { candidateId: input.candidateId } : {}),
      ...(input.attachmentType ? { attachmentType: input.attachmentType } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      storageKey: grant.storageKey,
      originalName: input.originalName.trim(),
      mimeType,
      sizeBytes: input.sizeBytes,
    });
    return {
      fileId,
      uploadUrl: grant.url,
      uploadHeaders: {
        'Content-Type': mimeType,
        ...Object.fromEntries(
          Object.entries(metadata).map(([key, value]) => [
            `x-amz-meta-${key.toLowerCase()}`,
            value,
          ]),
        ),
      },
      expiresAt: grant.expiresAt,
    };
  }

  async confirmFile(user: UserPrincipal, voteId: string, fileId: string) {
    await this.requireOwner(voteId, user);
    const file = await this.repository.findFile(fileId);
    if (
      !file ||
      file.voteId !== voteId ||
      file.ownerUserPrincipalId !== user.id ||
      file.requestId
    ) {
      throw new VoteContentChangeNotFoundError();
    }
    const stored = await this.storage.getObjectMetadata(file.storageKey);
    const storedMetadata = new Map(
      Object.entries(stored?.metadata ?? {}).map(([key, value]) => [
        key.toLowerCase(),
        value,
      ]),
    );
    if (
      !stored ||
      stored.contentLength !== file.sizeBytes ||
      stored.contentType?.trim().toLowerCase().split(';')[0] !==
        file.mimeType ||
      storedMetadata.get('voteid') !== voteId ||
      storedMetadata.get('owneruserprincipalid') !== user.id ||
      storedMetadata.get('kind') !== file.kind ||
      (file.candidateId &&
        storedMetadata.get('candidateid') !== file.candidateId)
    ) {
      throw new DomainError(
        'uploaded content change file does not match the grant',
      );
    }
    await this.repository.confirmFile(fileId, stored.eTag);
    return { fileId, confirmed: true };
  }

  async submit(
    user: UserPrincipal,
    input: {
      voteId: string;
      reason: string;
      documentFileId: string;
      proposal: VoteContentChangeProposal;
    },
  ) {
    await this.requireOwner(input.voteId, user);
    const reason = input.reason.trim();
    if (!reason || reason.length > 1000)
      throw new DomainError('change reason is required');
    return this.transactions.runInTransaction(
      () =>
        this.repository.submit({
          voteId: input.voteId,
          tenantId: user.tenantId!,
          userPrincipalId: user.id,
          reason,
          documentFileId: input.documentFileId,
          proposal: input.proposal,
          submittedAt: new Date(),
        }),
      { isolationLevel: 'serializable' },
    );
  }

  async listMine(user: UserPrincipal, voteId: string) {
    await this.requireOwner(voteId, user);
    return this.repository.listByVote(voteId);
  }

  async listForAdmin(user: UserPrincipal) {
    return this.repository.listByTenant(this.requireAdmin(user));
  }

  async getRequest(user: UserPrincipal, requestId: string) {
    const request = await this.repository.findRequest(requestId);
    if (!request) throw new VoteContentChangeNotFoundError();
    if (
      !(
        request.submittedByUserPrincipalId === user.id &&
        user.tenantId === request.tenantId
      ) &&
      !(user.tenantId === request.tenantId && user.hasTenantRole('vote-admin'))
    ) {
      throw new VoteContentChangeAccessDeniedError();
    }
    return request;
  }

  async review(
    user: UserPrincipal,
    input: {
      requestId: string;
      decision: 'APPROVED' | 'REJECTED';
      reason?: string;
    },
  ) {
    const tenantId = this.requireAdmin(user);
    const result = await this.transactions.runInTransaction(
      () =>
        this.repository.review({
          requestId: input.requestId,
          tenantId,
          reviewerId: user.id,
          decision: input.decision,
          reason: input.reason,
          reviewedAt: new Date(),
        }),
      { isolationLevel: 'serializable' },
    );
    if (result.status === 'INVALIDATED') {
      throw new DomainError(
        result.reviewReason ?? 'content change request is invalidated',
      );
    }
    return result;
  }

  async getFileDownload(user: UserPrincipal, voteId: string, fileId: string) {
    const file = await this.repository.findFile(fileId);
    const vote = await this.repository.findVote(voteId);
    if (!file || !vote || file.voteId !== voteId || !file.confirmedAt) {
      throw new VoteContentChangeNotFoundError();
    }
    const owner =
      vote.createdByUserPrincipalId === user.id &&
      vote.tenantId === user.tenantId;
    const admin =
      vote.tenantId === user.tenantId &&
      user.hasTenantRole('vote-admin') &&
      !!file.requestId;
    if (!owner && !admin) throw new VoteContentChangeAccessDeniedError();
    const grant = await this.storage.createPresignedGetObjectUrl(
      file.storageKey,
    );
    return { fileId, downloadUrl: grant.url, expiresAt: grant.expiresAt };
  }
}
