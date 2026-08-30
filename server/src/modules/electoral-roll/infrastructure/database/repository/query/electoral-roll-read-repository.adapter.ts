import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  ElectoralRollPageRequest,
  ElectoralRollReadRepositoryPort,
} from '../../../../application/port/persistence/query/electoral-roll-read-repository.port';
import {
  ElectoralRollMemberView,
  ElectoralRollPageItemView,
  ElectoralRollPageView,
  ElectoralRollView,
} from '../../../../application/query/dto/response/electoral-roll.view';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  getDatabaseEntities,
  loadedItems,
  type LoadedCollectionLike,
} from '../../../../../../platform/database/repository/database-repository.util';

type ElectoralRollMemberReadPersistence = {
  readonly id: string;
  readonly identifier: string;
  readonly groupKey: string | null;
  readonly voteWeight: number | string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

type ElectoralRollReadPersistence = {
  readonly id: string;
  readonly commission: { readonly id: string };
  readonly name: string;
  readonly revision: number;
  readonly memberCount: number | string;
  readonly members: LoadedCollectionLike<ElectoralRollMemberReadPersistence>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

@Injectable()
export class ElectoralRollReadRepositoryAdapter implements ElectoralRollReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async findDetailById(
    electoralRollId: string,
  ): Promise<ElectoralRollView | undefined> {
    const { ElectoralRollEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      ElectoralRollEntity as any,
      { id: electoralRollId } as any,
      {
        populate: ['commission', 'members'],
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as ElectoralRollReadPersistence | null;

    if (!entity) return undefined;

    return ElectoralRollView.of({
      id: entity.id,
      commissionId: entity.commission.id,
      name: entity.name,
      revision: entity.revision,
      members: loadedItems(entity.members)
        .map((member) =>
          ElectoralRollMemberView.of({
            id: member.id,
            electoralRollId: entity.id,
            identifier: member.identifier,
            groupKey: member.groupKey ?? undefined,
            voteWeight: Number(member.voteWeight),
            createdAt: member.createdAt,
            updatedAt: member.updatedAt,
          }),
        )
        .sort(
          (a, b) =>
            a.identifier.localeCompare(b.identifier) ||
            a.id.localeCompare(b.id),
        ),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  async findPage(
    request: ElectoralRollPageRequest,
  ): Promise<ElectoralRollPageView> {
    const { ElectoralRollEntity } = await getDatabaseEntities();
    const commissionFilter: Record<string, unknown> = {
      members: {
        userPrincipalId: request.userPrincipalId,
        status: 'ACTIVE',
      },
    };
    if (request.commissionId !== undefined) {
      commissionFilter.id = request.commissionId;
    }

    const where: Record<string, unknown> = { commission: commissionFilter };
    if (request.query !== undefined) {
      where.name = { $ilike: `%${request.query}%` };
    }

    const [entities, totalItems] = (await this.em.findAndCount(
      ElectoralRollEntity as any,
      where,
      {
        populate: ['commission'],
        limit: request.pageSize,
        offset: (request.page - 1) * request.pageSize,
        orderBy: { updatedAt: 'desc', id: 'desc' },
        ...JOINED_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as [ElectoralRollReadPersistence[], number];

    return ElectoralRollPageView.of({
      items: entities.map((entity) =>
        ElectoralRollPageItemView.of({
          id: entity.id,
          commissionId: entity.commission.id,
          name: entity.name,
          revision: entity.revision,
          memberCount: Number(entity.memberCount),
          updatedAt: entity.updatedAt,
        }),
      ),
      page: request.page,
      pageSize: request.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / request.pageSize),
    });
  }
}
