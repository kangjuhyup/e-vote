import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ParticipationRepositoryPort } from '../../../../application/port/persistence/command/participation-repository.port';
import type { CastParticipationTransactionResources } from '../../../../application/port/persistence/command/participation-repository.port';
import type { ParticipationAggregate } from '../../../../domain/participation.aggregate';
import { ParticipationStatus } from '../../../../../../shared/domain/voting/type/participation-status.type';
import { DomainError } from '../../../../../../shared/domain/domain-error';
import {
  ParticipationMapper,
  type ParticipationPersistence,
} from '../../mapper/participation.mapper';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from '../../../../../../platform/database/repository/database-repository.util';

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

  async runCastTransaction<T>(
    resources: CastParticipationTransactionResources,
    work: () => Promise<T>,
  ): Promise<T> {
    return this.em.transactional(async (transactionalEm) => {
      await this.lockCastResources(transactionalEm, resources);
      await this.assertGroupVoteWeightConsistency(transactionalEm, resources);

      return work();
    });
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
    await this.saveWithEntityManager(this.em, participation);
  }

  async saveCastWithResult(
    participation: ParticipationAggregate,
    selectedCandidateId: string,
  ): Promise<void> {
    await this.em.transactional(async (transactionalEm) => {
      await this.saveWithEntityManager(transactionalEm, participation);
      await transactionalEm.getConnection().execute(
        `
          insert into vote_results (
            id,
            vote_detail_id,
            candidate_id,
            vote_count,
            weighted_vote_count,
            created_at,
            updated_at
          ) values (?, ?, ?, 1, ?, current_timestamp, current_timestamp)
          on conflict (vote_detail_id, candidate_id) do update set
            vote_count = vote_results.vote_count + excluded.vote_count,
            weighted_vote_count = vote_results.weighted_vote_count + excluded.weighted_vote_count,
            updated_at = current_timestamp
        `,
        [
          nextRepositoryId(),
          participation.voteDetailId,
          selectedCandidateId,
          participation.voteWeight,
        ],
        'all',
        transactionalEm.getTransactionContext(),
      );
    });
  }

  private async saveWithEntityManager(
    em: EntityManager,
    participation: ParticipationAggregate,
  ): Promise<void> {
    const {
      CandidateEntity,
      ElectorEntity,
      FieldVotingSessionEntity,
      VoteDetailEntity,
      VoteParticipationEntity,
    } = await getDatabaseEntities();
    const now = new Date();

    await saveEntity(
      em,
      VoteParticipationEntity,
      participation.id,
      {
        createdAt: now,
      },
      {
        voteDetail: entityReference(
          em,
          VoteDetailEntity,
          participation.voteDetailId,
        ),
        elector: entityReference(em, ElectorEntity, participation.electorId),
        candidate: participation.candidateId
          ? entityReference(em, CandidateEntity, participation.candidateId)
          : null,
        groupKey: participation.groupKey ?? null,
        voteWeight: participation.voteWeight,
        votingChannel: participation.votingChannel,
        fieldVotingSession: participation.fieldVotingSessionId
          ? entityReference(
              em,
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

  private async lockCastResources(
    em: EntityManager,
    resources: CastParticipationTransactionResources,
  ): Promise<void> {
    const locks = [
      ['votes', resources.voteId],
      ['vote_details', resources.voteDetailId],
      ['electors', resources.electorId],
      ['candidates', resources.candidateId],
      ['field_voting_sessions', resources.fieldVotingSessionId],
    ] as const;

    for (const [table, id] of locks) {
      if (!id) {
        continue;
      }

      await em
        .getConnection()
        .execute(
          `select id from ${table} where id = ? for share`,
          [id],
          'all',
          em.getTransactionContext(),
        );
    }
  }

  private async assertGroupVoteWeightConsistency(
    em: EntityManager,
    resources: CastParticipationTransactionResources,
  ): Promise<void> {
    const rows = await em
      .getConnection()
      .execute<Array<{ vote_weight: string }>>(
        `select peer.vote_weight
       from electors current_elector
       join electors peer
         on peer.vote_id = current_elector.vote_id
         and peer.group_key = current_elector.group_key
       where current_elector.vote_id = ?
         and current_elector.id = ?
         and current_elector.group_key is not null
        for share of peer`,
        [resources.voteId, resources.electorId],
        'all',
        em.getTransactionContext(),
      );
    const distinctWeights = new Set(rows.map((row) => String(row.vote_weight)));

    if (distinctWeights.size > 1) {
      throw new DomainError(
        'electors in the same group must have the same vote weight',
      );
    }
  }
}
