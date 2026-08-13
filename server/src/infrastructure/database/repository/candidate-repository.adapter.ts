import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { CandidateRepositoryPort } from '../../../application/port/candidate-repository.port';
import type { CandidateAggregate } from '../../../domain/candidate/candidate.aggregate';
import {
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from './database-repository.util';

@Injectable()
export class CandidateRepositoryAdapter implements CandidateRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
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
