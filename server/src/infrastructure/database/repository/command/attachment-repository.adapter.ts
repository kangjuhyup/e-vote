import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  AttachmentTargetType,
  SaveAttachedFileParams,
  SaveAttachedFileResult,
} from '../../../../application/port/persistence/command/attachment-repository.port';
import type { AttachmentRepositoryPort } from '../../../../application/port/persistence/command/attachment-repository.port';
import {
  DatabaseEntity,
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
} from '../database-repository.util';

const ACTIVE_FILE_STATUS = 'ACTIVE';

@Injectable()
export class AttachmentRepositoryAdapter implements AttachmentRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async saveAttachedFile(
    params: SaveAttachedFileParams,
  ): Promise<SaveAttachedFileResult> {
    const entities = await getDatabaseEntities();
    const now = new Date();
    const file = await this.findOrCreateFile(entities.FileEntity, params, now);
    const attachment = await this.findOrCreateAttachment(
      entities,
      params,
      file,
      now,
    );

    await this.em.flush();

    return {
      attachmentId: attachment.id as string,
      fileId: file.id as string,
      storageKey: params.file.storageKey,
    };
  }

  private async findOrCreateFile(
    FileEntity: Awaited<ReturnType<typeof getDatabaseEntities>>['FileEntity'],
    params: SaveAttachedFileParams,
    now: Date,
  ): Promise<DatabaseEntity> {
    const existing = await this.em.findOne(FileEntity as any, {
      storageKey: params.file.storageKey,
      status: ACTIVE_FILE_STATUS,
    });

    if (existing) {
      return existing;
    }

    const file = this.em.create(
      FileEntity as any,
      {
        id: nextRepositoryId(),
        storageKey: params.file.storageKey,
        originalName: params.file.originalName,
        mimeType: params.file.mimeType,
        sizeBytes: params.file.sizeBytes,
        checksum: params.file.checksum ?? null,
        status: ACTIVE_FILE_STATUS,
        createdAt: now,
        deletedAt: null,
      } as any,
    ) as unknown as DatabaseEntity;
    this.em.persist(file as any);

    return file;
  }

  private async findOrCreateAttachment(
    entities: Awaited<ReturnType<typeof getDatabaseEntities>>,
    params: SaveAttachedFileParams,
    file: DatabaseEntity,
    now: Date,
  ): Promise<DatabaseEntity> {
    if (params.target.targetType === AttachmentTargetType.Vote) {
      return this.findOrCreateVoteAttachment(entities, params, file, now);
    }

    if (params.target.targetType === AttachmentTargetType.VoteDetail) {
      return this.findOrCreateVoteDetailAttachment(entities, params, file, now);
    }

    return this.findOrCreateCandidateAttachment(entities, params, file, now);
  }

  private async findOrCreateVoteAttachment(
    entities: Awaited<ReturnType<typeof getDatabaseEntities>>,
    params: SaveAttachedFileParams,
    file: DatabaseEntity,
    now: Date,
  ): Promise<DatabaseEntity> {
    const fileId = file.id as string;
    const existing = await this.em.findOne(
      entities.VoteAttachmentEntity as any,
      {
        vote: { id: params.target.voteId },
        file: { id: fileId },
      },
    );

    if (existing) {
      return existing;
    }

    const attachment = this.em.create(
      entities.VoteAttachmentEntity as any,
      {
        id: nextRepositoryId(),
        vote: entityReference(
          this.em,
          entities.VoteEntity,
          params.target.voteId,
        ),
        file,
        type: params.attachmentType,
        sortOrder: params.sortOrder,
        createdAt: now,
      } as any,
    ) as unknown as DatabaseEntity;
    this.em.persist(attachment as any);

    return attachment;
  }

  private async findOrCreateVoteDetailAttachment(
    entities: Awaited<ReturnType<typeof getDatabaseEntities>>,
    params: SaveAttachedFileParams,
    file: DatabaseEntity,
    now: Date,
  ): Promise<DatabaseEntity> {
    if (params.target.targetType !== AttachmentTargetType.VoteDetail) {
      throw new Error('invalid vote detail attachment target');
    }

    const target = params.target;
    const fileId = file.id as string;
    const existing = await this.em.findOne(
      entities.VoteDetailAttachmentEntity as any,
      {
        voteDetail: { id: target.voteDetailId },
        file: { id: fileId },
      },
    );

    if (existing) {
      return existing;
    }

    const attachment = this.em.create(
      entities.VoteDetailAttachmentEntity as any,
      {
        id: nextRepositoryId(),
        voteDetail: entityReference(
          this.em,
          entities.VoteDetailEntity,
          target.voteDetailId,
        ),
        file,
        type: params.attachmentType,
        sortOrder: params.sortOrder,
        createdAt: now,
      } as any,
    ) as unknown as DatabaseEntity;
    this.em.persist(attachment as any);

    return attachment;
  }

  private async findOrCreateCandidateAttachment(
    entities: Awaited<ReturnType<typeof getDatabaseEntities>>,
    params: SaveAttachedFileParams,
    file: DatabaseEntity,
    now: Date,
  ): Promise<DatabaseEntity> {
    if (params.target.targetType !== AttachmentTargetType.Candidate) {
      throw new Error('invalid candidate attachment target');
    }

    const target = params.target;
    const fileId = file.id as string;
    const existing = await this.em.findOne(
      entities.CandidateAttachmentEntity as any,
      {
        candidate: { id: target.candidateId },
        file: { id: fileId },
      },
    );

    if (existing) {
      return existing;
    }

    const attachment = this.em.create(
      entities.CandidateAttachmentEntity as any,
      {
        id: nextRepositoryId(),
        candidate: entityReference(
          this.em,
          entities.CandidateEntity,
          target.candidateId,
        ),
        file,
        type: params.attachmentType,
        sortOrder: params.sortOrder,
        createdAt: now,
      } as any,
    ) as unknown as DatabaseEntity;
    this.em.persist(attachment as any);

    return attachment;
  }
}
