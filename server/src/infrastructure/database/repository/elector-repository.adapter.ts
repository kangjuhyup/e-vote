import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ElectorRepositoryPort } from '../../../application/port/elector-repository.port';
import type { ElectorAggregate } from '../../../domain/elector/elector.aggregate';
import {
  ElectorMapper,
  type ElectorPersistence,
} from '../mapper/elector.mapper';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  loadedItems,
  nextRepositoryId,
  saveEntity,
  type DatabaseEntity,
  type LoadedCollectionLike,
} from './database-repository.util';

const ELECTOR_RELATIONS = ['vote', 'identityVerifications'] as const;
const SUCCESSFUL_IDENTITY_VERIFICATION_STATUS = 'SUCCESS';
type ElectorEntityPersistence = ElectorPersistence & {
  readonly identityVerifications: LoadedCollectionLike<DatabaseEntity>;
};

@Injectable()
export class ElectorRepositoryAdapter implements ElectorRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async findById(
    voteId: string,
    electorId: string,
  ): Promise<ElectorAggregate | undefined> {
    const { ElectorEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      ElectorEntity as any,
      {
        id: electorId,
        vote: { id: voteId },
      } as any,
      {
        populate: ELECTOR_RELATIONS,
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as ElectorEntityPersistence | null;

    return entity
      ? ElectorMapper.toDomain(entity, {
          identityVerified: this.hasSuccessfulIdentityVerification(entity),
        })
      : undefined;
  }

  async save(elector: ElectorAggregate): Promise<void> {
    const { ElectorEntity, VoteEntity } = await getDatabaseEntities();
    const now = new Date();

    await saveEntity(
      this.em,
      ElectorEntity,
      elector.id,
      {
        name: elector.identifier,
        createdAt: now,
      },
      {
        vote: entityReference(this.em, VoteEntity, elector.voteId),
        identifier: elector.identifier,
        groupKey: elector.groupKey ?? null,
        voteWeight: elector.voteWeight,
        status: elector.status,
        updatedAt: now,
      },
    );
  }

  private hasSuccessfulIdentityVerification(
    entity: ElectorEntityPersistence,
  ): boolean {
    return loadedItems<DatabaseEntity>(entity.identityVerifications).some(
      (verification) =>
        verification.status === SUCCESSFUL_IDENTITY_VERIFICATION_STATUS,
    );
  }
}
