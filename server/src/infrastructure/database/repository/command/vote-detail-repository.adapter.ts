import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { VoteDetailRepositoryPort } from '../../../../application/port/persistence/command/vote-detail-repository.port';
import type { VoteDetailAggregate } from '../../../../domain/vote/vote-detail.aggregate';
import {
  VoteDetailMapper,
  type VoteDetailPersistence,
} from '../../mapper/vote-detail.mapper';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from '../database-repository.util';

const VOTE_DETAIL_RELATIONS = ['vote'] as const;

@Injectable()
export class VoteDetailRepositoryAdapter implements VoteDetailRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async findById(
    voteDetailId: string,
  ): Promise<VoteDetailAggregate | undefined> {
    const { VoteDetailEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      VoteDetailEntity as any,
      { id: voteDetailId } as any,
      {
        populate: VOTE_DETAIL_RELATIONS,
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as VoteDetailPersistence | null;

    return entity ? VoteDetailMapper.toDomain(entity) : undefined;
  }

  async save(voteDetail: VoteDetailAggregate): Promise<void> {
    const { VoteEntity, VoteDetailEntity } = await getDatabaseEntities();
    const now = new Date();

    await saveEntity(
      this.em,
      VoteDetailEntity,
      voteDetail.id,
      {
        description: '',
        createdAt: now,
      },
      {
        vote: entityReference(this.em, VoteEntity, voteDetail.voteId),
        title: voteDetail.title,
        type: voteDetail.type,
        privacyModeOverride: voteDetail.overrides.privacyMode ?? null,
        participationUnitOverride:
          voteDetail.overrides.participationUnit ?? null,
        resultStorageModeOverride:
          voteDetail.overrides.resultStorageMode ?? null,
        voteWeightModeOverride: voteDetail.overrides.voteWeightMode ?? null,
        sortOrder: voteDetail.sortOrder,
        status: voteDetail.status,
        updatedAt: now,
      },
    );
  }
}
