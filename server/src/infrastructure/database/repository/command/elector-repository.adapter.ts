import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ElectorRepositoryPort } from '../../../../application/port/persistence/command/elector-repository.port';
import type { ElectorAggregate } from '../../../../domain/elector/elector.aggregate';
import { DomainError } from '../../../../domain/shared/domain-error';
import {
  ElectorMapper,
  type ElectorPersistence,
} from '../../mapper/elector.mapper';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  loadedItems,
  nextRepositoryId,
  saveEntity,
  type DatabaseEntity,
  type LoadedCollectionLike,
} from '../database-repository.util';

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
    await this.em.transactional(async (transactionalEm) => {
      await this.assertGroupVoteWeightConsistency(transactionalEm, elector);
      const { ElectorEntity, VoteEntity } = await getDatabaseEntities();
      const now = new Date();

      await saveEntity(
        transactionalEm,
        ElectorEntity,
        elector.id,
        {
          name: elector.identifier,
          createdAt: now,
        },
        {
          vote: entityReference(transactionalEm, VoteEntity, elector.voteId),
          identifier: elector.identifier,
          groupKey: elector.groupKey ?? null,
          voteWeight: elector.voteWeight,
          status: elector.status,
          updatedAt: now,
        },
      );
    });
  }

  private async assertGroupVoteWeightConsistency(
    em: EntityManager,
    elector: ElectorAggregate,
  ): Promise<void> {
    if (!elector.groupKey) {
      return;
    }

    await em
      .getConnection()
      .execute(
        'select pg_advisory_xact_lock(hashtextextended(?, 0))',
        [`${elector.voteId}:${elector.groupKey}`],
        'all',
        em.getTransactionContext(),
      );
    const rows = await em
      .getConnection()
      .execute<Array<{ vote_weight: string }>>(
        `select vote_weight
       from electors
       where vote_id = ? and group_key = ? and id <> ?
       for share`,
        [elector.voteId, elector.groupKey, elector.id],
        'all',
        em.getTransactionContext(),
      );

    if (rows.some((row) => Number(row.vote_weight) !== elector.voteWeight)) {
      throw new DomainError(
        'electors in the same group must have the same vote weight',
      );
    }
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
