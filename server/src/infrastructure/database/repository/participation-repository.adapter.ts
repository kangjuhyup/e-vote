import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ParticipationRepositoryPort } from '../../../application/port/participation-repository.port';
import type { ParticipationAggregate } from '../../../domain/participation/participation.aggregate';
import { ParticipationStatus } from '../../../domain/participation/type/participation-status.type';
import {
  ParticipationMapper,
  type ParticipationPersistence,
} from '../mapper/participation.mapper';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from './database-repository.util';

const PARTICIPATION_RELATIONS = [
  'voteDetail',
  'elector',
  'candidate',
  'fieldVotingSession',
] as const;

@Injectable()
export class ParticipationRepositoryAdapter implements ParticipationRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async findById(
    participationId: string,
  ): Promise<ParticipationAggregate | undefined> {
    const { VoteParticipationEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      VoteParticipationEntity as any,
      { id: participationId } as any,
      {
        populate: PARTICIPATION_RELATIONS,
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as ParticipationPersistence | null;

    return entity ? ParticipationMapper.toDomain(entity) : undefined;
  }

  async findCastByVoteDetailId(
    voteDetailId: string,
  ): Promise<ParticipationAggregate[]> {
    const { VoteParticipationEntity } = await getDatabaseEntities();
    const entities = (await this.em.find(
      VoteParticipationEntity as any,
      {
        voteDetail: { id: voteDetailId },
        status: ParticipationStatus.Cast,
      } as any,
      {
        populate: PARTICIPATION_RELATIONS,
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as ParticipationPersistence[];

    return entities.map((entity) => ParticipationMapper.toDomain(entity));
  }

  async save(participation: ParticipationAggregate): Promise<void> {
    const {
      CandidateEntity,
      ElectorEntity,
      FieldVotingSessionEntity,
      VoteDetailEntity,
      VoteParticipationEntity,
    } = await getDatabaseEntities();
    const now = new Date();

    await saveEntity(
      this.em,
      VoteParticipationEntity,
      participation.id,
      {
        createdAt: now,
      },
      {
        voteDetail: entityReference(
          this.em,
          VoteDetailEntity,
          participation.voteDetailId,
        ),
        elector: entityReference(
          this.em,
          ElectorEntity,
          participation.electorId,
        ),
        candidate: participation.candidateId
          ? entityReference(this.em, CandidateEntity, participation.candidateId)
          : null,
        groupKey: participation.groupKey ?? null,
        voteWeight: participation.voteWeight,
        votingChannel: participation.votingChannel,
        fieldVotingSession: participation.fieldVotingSessionId
          ? entityReference(
              this.em,
              FieldVotingSessionEntity,
              participation.fieldVotingSessionId,
            )
          : null,
        status: participation.status,
        participatedAt: participation.participatedAt,
        updatedAt: now,
      },
    );
  }
}
