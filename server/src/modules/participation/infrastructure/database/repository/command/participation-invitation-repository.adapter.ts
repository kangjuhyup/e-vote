import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ParticipationInvitationRepositoryPort } from '../../../../application/port/persistence/command/participation-invitation-repository.port';
import { ParticipationInvitationAggregate } from '../../../../domain/participation-invitation.aggregate';
import {
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from '../../../../../../platform/database/repository/database-repository.util';

type Persistence = {
  id: string;
  vote: { id: string };
  elector: { id: string };
  tokenDigest: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ParticipationInvitationRepositoryAdapter implements ParticipationInvitationRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async findByDigest(digest: string) {
    return this.findOne({ tokenDigest: digest });
  }

  async findByElector(voteId: string, electorId: string) {
    return this.findOne({ vote: { id: voteId }, elector: { id: electorId } });
  }

  async save(invitation: ParticipationInvitationAggregate): Promise<void> {
    const { ElectorEntity, ParticipationInvitationEntity, VoteEntity } =
      await getDatabaseEntities();
    await saveEntity(
      this.em,
      ParticipationInvitationEntity,
      invitation.id,
      {
        createdAt: invitation.createdAt,
      },
      {
        vote: entityReference(this.em, VoteEntity, invitation.voteId),
        elector: entityReference(this.em, ElectorEntity, invitation.electorId),
        tokenDigest: invitation.tokenDigest,
        expiresAt: invitation.expiresAt,
        revokedAt: invitation.revokedAt ?? null,
        updatedAt: invitation.updatedAt,
      },
    );
  }

  private async findOne(where: object) {
    const { ParticipationInvitationEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      ParticipationInvitationEntity as any,
      where,
      { populate: ['vote', 'elector'] } as any,
    )) as unknown as Persistence | null;
    return entity
      ? ParticipationInvitationAggregate.reconstitute({
          id: entity.id,
          voteId: entity.vote.id,
          electorId: entity.elector.id,
          tokenDigest: entity.tokenDigest,
          expiresAt: entity.expiresAt,
          revokedAt: entity.revokedAt ?? undefined,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        })
      : undefined;
  }
}
