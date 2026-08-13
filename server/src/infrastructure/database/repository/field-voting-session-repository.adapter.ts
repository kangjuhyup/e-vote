import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { FieldVotingSessionRepositoryPort } from '../../../application/port/field-voting-session-repository.port';
import type { FieldVotingSessionAggregate } from '../../../domain/field-voting/field-voting-session.aggregate';
import {
  FieldVotingSessionMapper,
  type FieldVotingSessionPersistence,
} from '../mapper/field-voting-session.mapper';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  loadedItems,
  nextRepositoryId,
  prepareEntityForSave,
  type DatabaseEntity,
  type LoadedCollectionLike,
} from './database-repository.util';

const FIELD_VOTING_SESSION_RELATIONS = [
  'commission',
  'vote',
  'managerLinks.commissionMember',
] as const;
type FieldVotingSessionEntityPersistence = Omit<
  FieldVotingSessionPersistence,
  'managerLinks'
> & {
  readonly managerLinks: LoadedCollectionLike<
    FieldVotingSessionPersistence['managerLinks'][number]
  >;
};

@Injectable()
export class FieldVotingSessionRepositoryAdapter implements FieldVotingSessionRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async findById(
    fieldVotingSessionId: string,
  ): Promise<FieldVotingSessionAggregate | undefined> {
    const { FieldVotingSessionEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      FieldVotingSessionEntity as any,
      { id: fieldVotingSessionId },
      {
        populate: FIELD_VOTING_SESSION_RELATIONS as unknown as never[],
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as FieldVotingSessionEntityPersistence | null;

    return entity ? this.toDomain(entity) : undefined;
  }

  async save(fieldVotingSession: FieldVotingSessionAggregate): Promise<void> {
    const {
      ElectionCommissionEntity,
      ElectionCommissionMemberEntity,
      FieldVotingSessionEntity,
      FieldVotingSessionManagerEntity,
      VoteEntity,
    } = await getDatabaseEntities();
    const now = new Date();
    const savedSession = await prepareEntityForSave(
      this.em,
      FieldVotingSessionEntity,
      fieldVotingSession.id,
      {
        createdAt: now,
      },
      {
        commission: entityReference(
          this.em,
          ElectionCommissionEntity,
          fieldVotingSession.commissionId,
        ),
        vote: entityReference(this.em, VoteEntity, fieldVotingSession.voteId),
        channel: fieldVotingSession.channel,
        title: fieldVotingSession.title,
        locationName: fieldVotingSession.locationName,
        address: fieldVotingSession.address,
        startsAt: fieldVotingSession.startsAt,
        endsAt: fieldVotingSession.endsAt,
        status: fieldVotingSession.status,
        updatedAt: now,
      },
    );

    await this.em.nativeDelete(FieldVotingSessionManagerEntity as any, {
      fieldVotingSession: { id: fieldVotingSession.id },
    });

    for (const managerId of fieldVotingSession.managerIds) {
      const managerLinkEntity = this.em.create(
        FieldVotingSessionManagerEntity as any,
        {
          id: nextRepositoryId(),
          fieldVotingSession: savedSession,
          commissionMember: entityReference(
            this.em,
            ElectionCommissionMemberEntity,
            managerId,
          ),
          assignedAt: now,
        } as any,
      ) as unknown as DatabaseEntity;
      this.em.persist(managerLinkEntity as any);
    }

    await this.em.flush();
  }

  private toDomain(
    entity: FieldVotingSessionEntityPersistence,
  ): FieldVotingSessionAggregate {
    return FieldVotingSessionMapper.toDomain({
      id: entity.id,
      commission: entity.commission,
      vote: entity.vote,
      channel: entity.channel,
      title: entity.title,
      locationName: entity.locationName,
      address: entity.address,
      managerLinks: loadedItems<
        FieldVotingSessionPersistence['managerLinks'][number]
      >(entity.managerLinks),
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      status: entity.status,
    } satisfies FieldVotingSessionPersistence);
  }
}
