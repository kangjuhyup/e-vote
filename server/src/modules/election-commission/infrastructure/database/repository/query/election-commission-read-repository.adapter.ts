import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ElectionCommissionReadRepositoryPort } from '../../../../application/port/persistence/query/election-commission-read-repository.port';
import {
  ElectionCommissionMemberView,
  ElectionCommissionPageView,
  ElectionCommissionSummaryView,
  ElectionCommissionView,
} from '../../../../application/query/dto/response/election-commission.view';
import type { ElectionCommissionMemberRole } from '../../../../domain/type/election-commission-member-role.type';
import type { ElectionCommissionMemberStatus } from '../../../../domain/type/election-commission-member-status.type';
import type { ElectionCommissionStatus } from '../../../../domain/type/election-commission-status.type';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  getDatabaseEntities,
  loadedItems,
  type LoadedCollectionLike,
} from '../../../../../../platform/database/repository/database-repository.util';

type CommissionMemberPersistence = {
  readonly id: string;
  readonly name: string;
  readonly role: ElectionCommissionMemberRole;
  readonly status: ElectionCommissionMemberStatus;
  readonly registeredAt: Date;
  readonly updatedAt: Date;
};

type CommissionPersistence = {
  readonly id: string;
  readonly name: string;
  readonly status: ElectionCommissionStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly members: LoadedCollectionLike<CommissionMemberPersistence>;
};

@Injectable()
export class ElectionCommissionReadRepositoryAdapter implements ElectionCommissionReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async findDetailById(
    commissionId: string,
  ): Promise<ElectionCommissionView | undefined> {
    const { ElectionCommissionEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      ElectionCommissionEntity as any,
      { id: commissionId, deletedAt: null },
      {
        populate: ['members'],
        ...JOINED_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as CommissionPersistence | null;

    if (!entity) {
      return undefined;
    }

    return ElectionCommissionView.of({
      ...this.toSummary(entity),
      members: loadedItems(entity.members)
        .filter((member) => member.status === 'ACTIVE')
        .map((member) =>
          ElectionCommissionMemberView.of({
            id: member.id,
            commissionId: entity.id,
            name: member.name,
            role: member.role,
            status: member.status,
            registeredAt: member.registeredAt,
            updatedAt: member.updatedAt,
          }),
        )
        .sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime()),
    });
  }

  async findPage(request: {
    readonly page: number;
    readonly pageSize: number;
  }): Promise<ElectionCommissionPageView> {
    const { ElectionCommissionEntity } = await getDatabaseEntities();
    const [entities, totalItems] = (await this.em.findAndCount(
      ElectionCommissionEntity as any,
      { deletedAt: null },
      {
        limit: request.pageSize,
        offset: (request.page - 1) * request.pageSize,
        orderBy: { createdAt: 'desc', id: 'desc' },
      } as any,
    )) as unknown as [CommissionPersistence[], number];

    return ElectionCommissionPageView.of({
      items: entities.map((entity) => this.toSummary(entity)),
      page: request.page,
      pageSize: request.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / request.pageSize),
    });
  }

  private toSummary(
    entity: CommissionPersistence,
  ): ElectionCommissionSummaryView {
    return ElectionCommissionSummaryView.of({
      id: entity.id,
      name: entity.name,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
