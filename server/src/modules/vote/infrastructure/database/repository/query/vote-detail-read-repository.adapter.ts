import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  VoteDetailPageRequest,
  VoteDetailReadRepositoryPort,
} from '../../../../application/port/persistence/query/vote-detail-read-repository.port';
import {
  VoteDetailPageReadView,
  VoteDetailPolicyOverridesReadView,
  VoteDetailReadView,
} from '../../../../application/query/dto/response/vote-detail-read.view';
import type { VoteDetailType } from '../../../../../../shared/domain/voting/type/vote-detail.type';
import type {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../../../shared/domain/voting/type/vote-policy.type';
import type { VoteDetailStatus } from '../../../../../../shared/domain/voting/type/vote-status.type';
import {
  SELECT_IN_RELATION_LOAD_OPTIONS,
  getDatabaseEntities,
  loadedItems,
  type LoadedCollectionLike,
} from '../../../../../../platform/database/repository/database-repository.util';
import { AttachmentView } from '../../../../application/query/dto/response/attachment.view';
import type { AttachmentType } from '../../../../application/port/persistence/command/attachment-repository.port';

const VOTE_DETAIL_READ_RELATIONS = ['vote', 'attachments.file'] as const;

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

type VoteDetailReadPersistence = {
  readonly id: string;
  readonly vote: { readonly id: string };
  readonly title: string;
  readonly description: string;
  readonly type: VoteDetailType;
  readonly privacyModeOverride: PrivacyMode | null;
  readonly participationUnitOverride: ParticipationUnit | null;
  readonly resultStorageModeOverride: ResultStorageMode | null;
  readonly voteWeightModeOverride: VoteWeightMode | null;
  readonly sortOrder: number;
  readonly status: VoteDetailStatus;
  readonly attachments?: LoadedCollectionLike<AttachmentReadPersistence>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

@Injectable()
export class VoteDetailReadRepositoryAdapter implements VoteDetailReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async findDetailById(
    voteId: string,
    voteDetailId: string,
  ): Promise<VoteDetailReadView | undefined> {
    const { VoteDetailEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      VoteDetailEntity as any,
      {
        id: voteDetailId,
        vote: { id: voteId },
      },
      {
        populate: VOTE_DETAIL_READ_RELATIONS,
        ...SELECT_IN_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as VoteDetailReadPersistence | null;

    return entity ? this.toView(entity) : undefined;
  }

  async findPage(
    request: VoteDetailPageRequest,
  ): Promise<VoteDetailPageReadView> {
    const { VoteDetailEntity } = await getDatabaseEntities();
    const [entities, totalItems] = (await this.em.findAndCount(
      VoteDetailEntity as any,
      { vote: { id: request.voteId } },
      {
        populate: VOTE_DETAIL_READ_RELATIONS,
        limit: request.pageSize,
        offset: (request.page - 1) * request.pageSize,
        orderBy: {
          sortOrder: 'asc',
          createdAt: 'desc',
          id: 'desc',
        },
        ...SELECT_IN_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as [VoteDetailReadPersistence[], number];

    return VoteDetailPageReadView.of({
      items: entities.map((entity) => this.toView(entity)),
      page: request.page,
      pageSize: request.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / request.pageSize),
    });
  }

  private toView(entity: VoteDetailReadPersistence): VoteDetailReadView {
    return VoteDetailReadView.of({
      id: entity.id,
      voteId: entity.vote.id,
      title: entity.title,
      description: entity.description,
      type: entity.type,
      overrides: this.toOverridesView(entity),
      sortOrder: entity.sortOrder,
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

  private toOverridesView(
    entity: VoteDetailReadPersistence,
  ): VoteDetailPolicyOverridesReadView | undefined {
    const overrides = {
      privacyMode: entity.privacyModeOverride ?? undefined,
      participationUnit: entity.participationUnitOverride ?? undefined,
      resultStorageMode: entity.resultStorageModeOverride ?? undefined,
      voteWeightMode: entity.voteWeightModeOverride ?? undefined,
    };

    return Object.values(overrides).some((value) => value !== undefined)
      ? VoteDetailPolicyOverridesReadView.of(overrides)
      : undefined;
  }
}
