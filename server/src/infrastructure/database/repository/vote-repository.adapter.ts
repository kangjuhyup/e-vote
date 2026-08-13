import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { VoteRepositoryPort } from '../../../application/port/vote-repository.port';
import type { VoteAggregate } from '../../../domain/vote/vote.aggregate';
import { VoteMapper, type VotePersistence } from '../mapper/vote.mapper';
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

const VOTE_RELATIONS = ['commission', 'votingChannels'] as const;
type VoteEntityPersistence = Omit<VotePersistence, 'votingChannels'> & {
  readonly votingChannels: LoadedCollectionLike<
    VotePersistence['votingChannels'][number]
  >;
};

@Injectable()
export class VoteRepositoryAdapter implements VoteRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async findById(voteId: string): Promise<VoteAggregate | undefined> {
    const { VoteEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      VoteEntity as any,
      { id: voteId } as any,
      {
        populate: VOTE_RELATIONS,
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as VoteEntityPersistence | null;

    return entity ? this.toDomain(entity) : undefined;
  }

  async save(vote: VoteAggregate): Promise<void> {
    const { ElectionCommissionEntity, VoteEntity, VoteVotingChannelEntity } =
      await getDatabaseEntities();
    const now = new Date();
    const savedVote = await prepareEntityForSave(
      this.em,
      VoteEntity,
      vote.id,
      {
        description: '',
        startedAt: now,
        endedAt: now,
        createdAt: now,
      },
      {
        commission: entityReference(
          this.em,
          ElectionCommissionEntity,
          vote.commissionId,
        ),
        title: vote.title,
        defaultPrivacyMode: vote.defaultPolicy.privacyMode,
        defaultParticipationUnit: vote.defaultPolicy.participationUnit,
        defaultResultStorageMode: vote.defaultPolicy.resultStorageMode,
        defaultVoteWeightMode: vote.defaultPolicy.voteWeightMode,
        identityVerificationRequired: vote.identityVerificationPolicy.required,
        identityVerificationProvider:
          vote.identityVerificationPolicy.provider ?? null,
        identityVerificationMethod:
          vote.identityVerificationPolicy.method ?? null,
        status: vote.status,
        updatedAt: now,
      },
    );

    await this.em.nativeDelete(VoteVotingChannelEntity as any, {
      vote: { id: vote.id },
    });

    for (const channel of vote.votingChannels) {
      const votingChannelEntity = this.em.create(
        VoteVotingChannelEntity as any,
        {
          id: nextRepositoryId(),
          vote: savedVote,
          channel,
          createdAt: now,
        } as any,
      ) as unknown as DatabaseEntity;
      this.em.persist(votingChannelEntity as any);
    }

    await this.em.flush();
  }

  private toDomain(entity: VoteEntityPersistence): VoteAggregate {
    return VoteMapper.toDomain({
      id: entity.id,
      commission: entity.commission,
      title: entity.title,
      votingChannels: loadedItems<VotePersistence['votingChannels'][number]>(
        entity.votingChannels,
      ),
      defaultPrivacyMode: entity.defaultPrivacyMode,
      defaultParticipationUnit: entity.defaultParticipationUnit,
      defaultResultStorageMode: entity.defaultResultStorageMode,
      defaultVoteWeightMode: entity.defaultVoteWeightMode,
      identityVerificationRequired: entity.identityVerificationRequired,
      identityVerificationProvider: entity.identityVerificationProvider,
      identityVerificationMethod: entity.identityVerificationMethod,
      status: entity.status,
    } satisfies VotePersistence);
  }
}
