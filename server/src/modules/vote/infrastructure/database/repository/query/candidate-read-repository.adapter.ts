import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  CandidatePageRequest,
  CandidateReadRepositoryPort,
} from '../../../../application/port/persistence/query/candidate-read-repository.port';
import {
  CandidatePageReadView,
  CandidateReadView,
} from '../../../../application/query/dto/response/candidate-read.view';
import type { CandidateStatus } from '../../../../../../shared/domain/voting/type/candidate-status.type';
import {
  SELECT_IN_RELATION_LOAD_OPTIONS,
  getDatabaseEntities,
  loadedItems,
  type LoadedCollectionLike,
} from '../../../../../../platform/database/repository/database-repository.util';
import { AttachmentView } from '../../../../application/query/dto/response/attachment.view';
import type { AttachmentType } from '../../../../application/port/persistence/command/attachment-repository.port';

const CANDIDATE_READ_RELATIONS = [
  'voteDetail.vote',
  'attachments.file',
] as const;

type AttachmentReadPersistence = {
  readonly id: string;
  readonly type: AttachmentType;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly file: {
    readonly id: string;
    readonly originalName: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
    readonly status: string;
  };
};

type CandidateReadPersistence = {
  readonly id: string;
  readonly voteDetail: {
    readonly id: string;
    readonly vote: { readonly id: string };
  };
  readonly candidateNo: number;
  readonly name: string;
  readonly description: string;
  readonly status: CandidateStatus;
  readonly attachments?: LoadedCollectionLike<AttachmentReadPersistence>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

@Injectable()
export class CandidateReadRepositoryAdapter implements CandidateReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async findDetailById(
    voteId: string,
    voteDetailId: string,
    candidateId: string,
  ): Promise<CandidateReadView | undefined> {
    const { CandidateEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      CandidateEntity as any,
      {
        id: candidateId,
        voteDetail: {
          id: voteDetailId,
          vote: { id: voteId },
        },
      },
      {
        populate: CANDIDATE_READ_RELATIONS,
        ...SELECT_IN_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as CandidateReadPersistence | null;

    return entity ? this.toView(entity) : undefined;
  }

  async findPage(
    request: CandidatePageRequest,
  ): Promise<CandidatePageReadView> {
    const { CandidateEntity } = await getDatabaseEntities();
    const [entities, totalItems] = (await this.em.findAndCount(
      CandidateEntity as any,
      {
        voteDetail: {
          id: request.voteDetailId,
          vote: { id: request.voteId },
        },
      },
      {
        populate: CANDIDATE_READ_RELATIONS,
        limit: request.pageSize,
        offset: (request.page - 1) * request.pageSize,
        orderBy: {
          candidateNo: 'asc',
          createdAt: 'desc',
          id: 'desc',
        },
        ...SELECT_IN_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as [CandidateReadPersistence[], number];

    return CandidatePageReadView.of({
      items: entities.map((entity) => this.toView(entity)),
      page: request.page,
      pageSize: request.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / request.pageSize),
    });
  }

  private toView(entity: CandidateReadPersistence): CandidateReadView {
    return CandidateReadView.of({
      id: entity.id,
      voteId: entity.voteDetail.vote.id,
      voteDetailId: entity.voteDetail.id,
      candidateNo: entity.candidateNo,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      attachments: loadedItems(entity.attachments ?? [])
        .filter((attachment) => attachment.file.status === 'ACTIVE')
        .map((attachment) =>
          AttachmentView.of({
            id: attachment.id,
            fileId: attachment.file.id,
            type: attachment.type,
            originalName: attachment.file.originalName,
            mimeType: attachment.file.mimeType,
            sizeBytes: attachment.file.sizeBytes,
            sortOrder: attachment.sortOrder,
            createdAt: attachment.createdAt,
          }),
        )
        .sort(
          (left, right) =>
            left.sortOrder - right.sortOrder ||
            left.createdAt.getTime() - right.createdAt.getTime() ||
            left.id.localeCompare(right.id),
        ),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
