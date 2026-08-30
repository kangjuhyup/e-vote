import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { FieldVotingSessionReadRepositoryPort } from '../../../../application/port/persistence/query/field-voting-session-read-repository.port';
import {
  FieldVotingSessionPageView,
  FieldVotingSessionView,
} from '../../../../application/query/dto/response/field-voting-session.view';
import type { FieldVotingSessionStatus } from '../../../../../../shared/domain/voting/type/field-voting-session-status.type';
import type { VotingChannel } from '../../../../../../shared/domain/voting/type/voting-channel.type';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  getDatabaseEntities,
  loadedItems,
  type LoadedCollectionLike,
} from '../../../../../../platform/database/repository/database-repository.util';

type SessionPersistence = {
  readonly id: string;
  readonly commission: { readonly id: string };
  readonly vote: { readonly id: string };
  readonly channel: VotingChannel;
  readonly title: string;
  readonly locationName: string;
  readonly address: string;
  readonly managerLinks: LoadedCollectionLike<{
    readonly commissionMember: { readonly id: string };
  }>;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: FieldVotingSessionStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

const RELATIONS = [
  'commission',
  'vote',
  'managerLinks.commissionMember',
] as const;

@Injectable()
export class FieldVotingSessionReadRepositoryAdapter implements FieldVotingSessionReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async findDetailById(
    fieldVotingSessionId: string,
  ): Promise<FieldVotingSessionView | undefined> {
    const { FieldVotingSessionEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      FieldVotingSessionEntity as any,
      { id: fieldVotingSessionId },
      { populate: RELATIONS, ...JOINED_RELATION_LOAD_OPTIONS } as any,
    )) as unknown as SessionPersistence | null;

    return entity ? this.toView(entity) : undefined;
  }

  async findPage(request: {
    readonly voteId: string;
    readonly page: number;
    readonly pageSize: number;
  }): Promise<FieldVotingSessionPageView> {
    const { FieldVotingSessionEntity } = await getDatabaseEntities();
    const [entities, totalItems] = (await this.em.findAndCount(
      FieldVotingSessionEntity as any,
      { vote: { id: request.voteId } },
      {
        populate: RELATIONS,
        limit: request.pageSize,
        offset: (request.page - 1) * request.pageSize,
        orderBy: { startsAt: 'asc', id: 'asc' },
        ...JOINED_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as [SessionPersistence[], number];

    return FieldVotingSessionPageView.of({
      items: entities.map((entity) => this.toView(entity)),
      page: request.page,
      pageSize: request.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / request.pageSize),
    });
  }

  private toView(entity: SessionPersistence): FieldVotingSessionView {
    return FieldVotingSessionView.of({
      id: entity.id,
      commissionId: entity.commission.id,
      voteId: entity.vote.id,
      channel: entity.channel,
      title: entity.title,
      locationName: entity.locationName,
      address: entity.address,
      managerIds: loadedItems(entity.managerLinks)
        .map((link) => link.commissionMember.id)
        .sort(),
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
