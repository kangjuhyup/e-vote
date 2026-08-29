import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { CandidateRepositoryPort } from '../../../../application/port/persistence/command/candidate-repository.port';
import type { CandidateAggregate } from '../../../../domain/candidate/candidate.aggregate';
import {
  CandidateMapper,
  type CandidatePersistence,
} from '../../mapper/candidate.mapper';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from '../database-repository.util';

const CANDIDATE_RELATIONS = ['voteDetail'] as const;

@Injectable()
export class CandidateRepositoryAdapter implements CandidateRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async findById(candidateId: string): Promise<CandidateAggregate | undefined> {
    const { CandidateEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      CandidateEntity as any,
      { id: candidateId } as any,
      {
        populate: CANDIDATE_RELATIONS,
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as CandidatePersistence | null;

    return entity ? CandidateMapper.toDomain(entity) : undefined;
  }

  async save(candidate: CandidateAggregate): Promise<void> {
    const { CandidateEntity, VoteDetailEntity } = await getDatabaseEntities();
    const now = new Date();

    await saveEntity(
      this.em,
      CandidateEntity,
      candidate.id,
      {
        description: '',
        createdAt: now,
      },
      {
        voteDetail: entityReference(
          this.em,
          VoteDetailEntity,
          candidate.voteDetailId,
        ),
        candidateNo: candidate.candidateNo,
        name: candidate.name,
        status: candidate.status,
        updatedAt: now,
      },
    );
  }
}
