import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { VoteRepositoryPort } from '../../../../application/port/persistence/command/vote-repository.port';
import type { VoteAggregate } from '../../../../domain/vote/vote.aggregate';
import type { VoteSetupLifecyclePort } from '../../../../../../shared/application/port/capability/vote-billing.port';
import { ManagedResourceNotFoundError } from '../../../../../../shared/application/error/managed-resource.error';
import { VoteMapper, type VotePersistence } from '../../mapper/vote.mapper';
import {
  SELECT_IN_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  loadedItems,
  nextRepositoryId,
  prepareEntityForSave,
  type DatabaseEntity,
  type LoadedCollectionLike,
} from '../../../../../../platform/database/repository/database-repository.util';

const VOTE_RELATIONS = [
  'commission',
  'electoralRollSnapshot',
  'votingChannels',
] as const;
type VoteEntityPersistence = Omit<VotePersistence, 'votingChannels'> & {
  readonly votingChannels: LoadedCollectionLike<
    VotePersistence['votingChannels'][number]
  >;
};

@Injectable()
export class VoteRepositoryAdapter
  implements VoteRepositoryPort, VoteSetupLifecyclePort
{
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
        ...SELECT_IN_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as VoteEntityPersistence | null;

    return entity ? this.toDomain(entity) : undefined;
  }

  async lockVote(voteId: string): Promise<void> {
    const em = this.em.getContext();
    const rows = await em
      .getConnection()
      .execute(
        'select "id" from "votes" where "id" = ? for update',
        [voteId],
        'all',
        em.getTransactionContext(),
      );
    if (rows.length === 0) throw new ManagedResourceNotFoundError('vote');
  }

  async save(vote: VoteAggregate): Promise<void> {
    const {
      ElectionCommissionEntity,
      ElectoralRollSnapshotEntity,
      VoteEntity,
      VoteVotingChannelEntity,
    } = await getDatabaseEntities();
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
        createdByUserPrincipalId: vote.createdByUserPrincipalId ?? null,
        commission: entityReference(
          this.em,
          ElectionCommissionEntity,
          vote.commissionId,
        ),
        electoralRollSnapshot: vote.electoralRollSnapshotId
          ? entityReference(
              this.em,
              ElectoralRollSnapshotEntity,
              vote.electoralRollSnapshotId,
            )
          : null,
        billingOrderId: vote.billingOrderId ?? null,
        finalizedAt: vote.finalizedAt ?? null,
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

  async lockForBilling(params: {
    voteId: string;
    billingOrderId: string;
  }): Promise<void> {
    const vote = await this.findById(params.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    vote.lockForBilling(params.billingOrderId);
    await this.save(vote);
  }

  async finalizePaidBilling(params: {
    voteId: string;
    billingOrderId: string;
    finalizedAt: Date;
  }): Promise<void> {
    const vote = await this.findById(params.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    vote.finalizePaidBilling(params);
    await this.save(vote);
  }

  async assertBillingCancellationAllowed(params: {
    voteId: string;
    billingOrderId: string;
  }): Promise<void> {
    const vote = await this.findById(params.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    vote.assertBillingCancellationAllowed(params.billingOrderId);
  }

  async releaseBilling(params: {
    voteId: string;
    billingOrderId: string;
  }): Promise<void> {
    const vote = await this.findById(params.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    vote.releaseBilling(params.billingOrderId);
    await this.save(vote);
  }

  private toDomain(entity: VoteEntityPersistence): VoteAggregate {
    return VoteMapper.toDomain({
      id: entity.id,
      createdByUserPrincipalId: entity.createdByUserPrincipalId,
      commission: entity.commission,
      electoralRollSnapshot: entity.electoralRollSnapshot,
      billingOrderId: entity.billingOrderId,
      finalizedAt: entity.finalizedAt,
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
