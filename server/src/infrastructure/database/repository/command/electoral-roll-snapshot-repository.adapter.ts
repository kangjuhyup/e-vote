import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ElectoralRollSnapshotRepositoryPort } from '../../../../application/port/persistence/command/electoral-roll-snapshot-repository.port';
import {
  ElectoralRollSnapshotAggregate,
  ElectoralRollSnapshotMember,
} from '../../../../domain/electoral-roll/electoral-roll-snapshot.aggregate';
import { DomainError } from '../../../../domain/shared/domain-error';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  loadedItems,
  nextRepositoryId,
  type LoadedCollectionLike,
} from '../database-repository.util';

const SNAPSHOT_RELATIONS = ['sourceRoll', 'commission', 'members'] as const;

type SnapshotMemberPersistence = {
  readonly id: string;
  readonly sourceMemberId: string;
  readonly identifier: string;
  readonly groupKey: string | null;
  readonly voteWeight: number | string;
};

type SnapshotPersistence = {
  readonly id: string;
  readonly sourceRoll: { readonly id: string };
  readonly commission: { readonly id: string };
  readonly rollName: string;
  readonly sourceRevision: number;
  readonly memberCount: number;
  readonly contentHash: string;
  readonly createdAt: Date;
  readonly members: LoadedCollectionLike<SnapshotMemberPersistence>;
};

@Injectable()
export class ElectoralRollSnapshotRepositoryAdapter implements ElectoralRollSnapshotRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  nextMemberId(): string {
    return nextRepositoryId();
  }

  async findById(
    snapshotId: string,
  ): Promise<ElectoralRollSnapshotAggregate | undefined> {
    const { ElectoralRollSnapshotEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      ElectoralRollSnapshotEntity as any,
      { id: snapshotId } as any,
      {
        populate: SNAPSHOT_RELATIONS,
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as SnapshotPersistence | null;

    return entity ? this.toDomain(entity) : undefined;
  }

  async findBySourceRevision(
    electoralRollId: string,
    sourceRevision: number,
  ): Promise<ElectoralRollSnapshotAggregate | undefined> {
    const { ElectoralRollSnapshotEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      ElectoralRollSnapshotEntity as any,
      {
        sourceRoll: { id: electoralRollId },
        sourceRevision,
      } as any,
      {
        populate: SNAPSHOT_RELATIONS,
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as SnapshotPersistence | null;

    return entity ? this.toDomain(entity) : undefined;
  }

  async save(snapshot: ElectoralRollSnapshotAggregate): Promise<void> {
    const {
      ElectionCommissionEntity,
      ElectoralRollEntity,
      ElectoralRollSnapshotEntity,
      ElectoralRollSnapshotMemberEntity,
    } = await getDatabaseEntities();
    const existing = await this.em.findOne(ElectoralRollSnapshotEntity as any, {
      id: snapshot.id,
    });
    if (existing) return;

    const snapshotEntity = this.em.create(
      ElectoralRollSnapshotEntity as any,
      {
        id: snapshot.id,
        sourceRoll: entityReference(
          this.em,
          ElectoralRollEntity,
          snapshot.electoralRollId,
        ),
        commission: entityReference(
          this.em,
          ElectionCommissionEntity,
          snapshot.commissionId,
        ),
        rollName: snapshot.rollName,
        sourceRevision: snapshot.sourceRevision,
        memberCount: snapshot.memberCount,
        contentHash: snapshot.contentHash,
        createdAt: snapshot.createdAt,
      } as any,
    );
    this.em.persist(snapshotEntity);

    for (const member of snapshot.members) {
      this.em.persist(
        this.em.create(
          ElectoralRollSnapshotMemberEntity as any,
          {
            id: member.id,
            snapshot: snapshotEntity,
            sourceMemberId: member.sourceMemberId,
            identifier: member.identifier,
            groupKey: member.groupKey ?? null,
            voteWeight: member.voteWeight,
            createdAt: snapshot.createdAt,
          } as any,
        ),
      );
    }
    await this.em.flush();
  }

  async hasVoteElectors(voteId: string): Promise<boolean> {
    const { ElectorEntity } = await getDatabaseEntities();
    return (
      (await this.em.count(ElectorEntity as any, {
        vote: { id: voteId },
      })) > 0
    );
  }

  async materializeVoteElectors(
    voteId: string,
    snapshotId: string,
  ): Promise<void> {
    const {
      ElectorEntity,
      ElectorAttachmentEntity,
      ElectorIdentityVerificationEntity,
      ElectoralRollSnapshotMemberEntity,
      VoteEntity,
      VoteParticipationEntity,
    } = await getDatabaseEntities();
    const [participationCount, identityVerificationCount, attachmentCount] =
      await Promise.all([
        this.em.count(
          VoteParticipationEntity as any,
          {
            voteDetail: { vote: { id: voteId } },
          } as any,
        ),
        this.em.count(
          ElectorIdentityVerificationEntity as any,
          {
            elector: { vote: { id: voteId } },
          } as any,
        ),
        this.em.count(
          ElectorAttachmentEntity as any,
          {
            elector: { vote: { id: voteId } },
          } as any,
        ),
      ]);
    if (
      participationCount > 0 ||
      identityVerificationCount > 0 ||
      attachmentCount > 0
    ) {
      throw new DomainError(
        'vote electors with operational history cannot be replaced',
      );
    }

    const members = (await this.em.find(
      ElectoralRollSnapshotMemberEntity as any,
      { snapshot: { id: snapshotId } },
      { orderBy: { identifier: 'asc', id: 'asc' } } as any,
    )) as unknown as SnapshotMemberPersistence[];

    await this.em.nativeDelete(ElectorEntity as any, {
      vote: { id: voteId },
    });

    const now = new Date();
    for (const member of members) {
      this.em.persist(
        this.em.create(
          ElectorEntity as any,
          {
            id: nextRepositoryId(),
            vote: entityReference(this.em, VoteEntity, voteId),
            snapshotMember: entityReference(
              this.em,
              ElectoralRollSnapshotMemberEntity,
              member.id,
            ),
            name: member.identifier,
            identifier: member.identifier,
            phoneNumber: null,
            phoneNumberHash: null,
            birthDate: null,
            groupKey: member.groupKey,
            voteWeight: Number(member.voteWeight),
            status: 'ELIGIBLE',
            createdAt: now,
            updatedAt: now,
          } as any,
        ),
      );
    }
    await this.em.flush();
  }

  private toDomain(
    entity: SnapshotPersistence,
  ): ElectoralRollSnapshotAggregate {
    const members = loadedItems(entity.members).map((member) =>
      ElectoralRollSnapshotMember.of({
        id: member.id,
        sourceMemberId: member.sourceMemberId,
        identifier: member.identifier,
        groupKey: member.groupKey ?? undefined,
        voteWeight: Number(member.voteWeight),
      }),
    );

    if (members.length !== entity.memberCount) {
      throw new DomainError(
        'snapshot member count does not match persisted members',
      );
    }

    return ElectoralRollSnapshotAggregate.reconstitute({
      id: entity.id,
      electoralRollId: entity.sourceRoll.id,
      commissionId: entity.commission.id,
      rollName: entity.rollName,
      sourceRevision: entity.sourceRevision,
      contentHash: entity.contentHash,
      members,
      createdAt: entity.createdAt,
    });
  }
}
