import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  VoteDetailPageRequest,
  VoteDetailReadRepositoryPort,
} from '../../../application/port/vote-detail-read-repository.port';
import {
  VoteDetailPageReadView,
  VoteDetailPolicyOverridesReadView,
  VoteDetailReadView,
} from '../../../application/query/vote-detail-read.view';
import type { VoteDetailType } from '../../../domain/vote/type/vote-detail.type';
import type {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../domain/vote/type/vote-policy.type';
import type { VoteDetailStatus } from '../../../domain/vote/type/vote-status.type';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  getDatabaseEntities,
} from './database-repository.util';

const VOTE_DETAIL_READ_RELATIONS = ['vote'] as const;

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
      } as any,
      {
        populate: VOTE_DETAIL_READ_RELATIONS,
        ...JOINED_RELATION_LOAD_OPTIONS,
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
      { vote: { id: request.voteId } } as any,
      {
        populate: VOTE_DETAIL_READ_RELATIONS,
        limit: request.pageSize,
        offset: (request.page - 1) * request.pageSize,
        orderBy: {
          sortOrder: 'asc',
          createdAt: 'desc',
          id: 'desc',
        },
        ...JOINED_RELATION_LOAD_OPTIONS,
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
