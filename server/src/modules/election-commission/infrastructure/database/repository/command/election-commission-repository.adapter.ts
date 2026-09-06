import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ElectionCommissionRepositoryPort } from '../../../../application/port/persistence/command/election-commission-repository.port';
import type { ElectionCommissionAggregate } from '../../../../domain/election-commission.aggregate';
import {
  ElectionCommissionMapper,
  type ElectionCommissionPersistence,
} from '../../mapper/election-commission.mapper';
import {
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from '../../../../../../platform/database/repository/database-repository.util';

@Injectable()
export class ElectionCommissionRepositoryAdapter implements ElectionCommissionRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async softDelete(commissionId: string, deletedAt: Date): Promise<void> {
    const { ElectionCommissionEntity } = await getDatabaseEntities();
    await this.em.nativeUpdate(
      ElectionCommissionEntity as any,
      { id: commissionId },
      { deletedAt, status: 'SUSPENDED', updatedAt: deletedAt },
    );
  }

  nextId(): string {
    return nextRepositoryId();
  }

  async findById(
    commissionId: string,
  ): Promise<ElectionCommissionAggregate | undefined> {
    const { ElectionCommissionEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(ElectionCommissionEntity as any, {
      id: commissionId,
      deletedAt: null,
    })) as unknown as ElectionCommissionPersistence | null;

    return entity ? ElectionCommissionMapper.toDomain(entity) : undefined;
  }

  async save(commission: ElectionCommissionAggregate): Promise<void> {
    const { ElectionCommissionEntity } = await getDatabaseEntities();
    const now = new Date();

    await saveEntity(
      this.em,
      ElectionCommissionEntity,
      commission.id,
      {
        createdAt: commission.createdAt,
      },
      {
        name: commission.name,
        status: commission.status,
        updatedAt: now,
      },
    );
  }
}
