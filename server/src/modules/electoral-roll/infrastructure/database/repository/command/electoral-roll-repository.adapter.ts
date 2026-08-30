import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ElectoralRollRepositoryPort } from '../../../../application/port/persistence/command/electoral-roll-repository.port';
import { ElectoralRollAggregate } from '../../../../domain/electoral-roll.aggregate';
import { ElectoralRollMemberAggregate } from '../../../../domain/electoral-roll-member.aggregate';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from '../../../../../../platform/database/repository/database-repository.util';

type ElectoralRollPersistence = {
  readonly id: string;
  readonly commission: { readonly id: string };
  readonly name: string;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

type ElectoralRollMemberPersistence = {
  readonly id: string;
  readonly electoralRoll: { readonly id: string };
  readonly identifier: string;
  readonly groupKey: string | null;
  readonly voteWeight: number | string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

@Injectable()
export class ElectoralRollRepositoryAdapter implements ElectoralRollRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  nextMemberId(): string {
    return nextRepositoryId();
  }

  async findById(
    electoralRollId: string,
  ): Promise<ElectoralRollAggregate | undefined> {
    const { ElectoralRollEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      ElectoralRollEntity as any,
      { id: electoralRollId } as any,
      {
        populate: ['commission'],
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as ElectoralRollPersistence | null;

    return entity
      ? ElectoralRollAggregate.reconstitute({
          id: entity.id,
          commissionId: entity.commission.id,
          name: entity.name,
          revision: entity.revision,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt,
        })
      : undefined;
  }

  async findMemberById(
    electoralRollId: string,
    memberId: string,
  ): Promise<ElectoralRollMemberAggregate | undefined> {
    const { ElectoralRollMemberEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      ElectoralRollMemberEntity as any,
      {
        id: memberId,
        electoralRoll: { id: electoralRollId },
      } as any,
      {
        populate: ['electoralRoll'],
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as ElectoralRollMemberPersistence | null;

    return entity ? this.toMember(entity) : undefined;
  }

  async findMembersByRollId(
    electoralRollId: string,
  ): Promise<readonly ElectoralRollMemberAggregate[]> {
    const { ElectoralRollMemberEntity } = await getDatabaseEntities();
    const entities = (await this.em.find(
      ElectoralRollMemberEntity as any,
      { electoralRoll: { id: electoralRollId } },
      {
        populate: ['electoralRoll'],
        orderBy: { identifier: 'asc', id: 'asc' },
        ...JOINED_RELATION_LOAD_OPTIONS,
      } as any,
    )) as unknown as ElectoralRollMemberPersistence[];

    return entities.map((entity) => this.toMember(entity));
  }

  async save(electoralRoll: ElectoralRollAggregate): Promise<void> {
    const { ElectionCommissionEntity, ElectoralRollEntity } =
      await getDatabaseEntities();
    await saveEntity(
      this.em,
      ElectoralRollEntity,
      electoralRoll.id,
      {
        createdAt: electoralRoll.createdAt,
      },
      {
        commission: entityReference(
          this.em,
          ElectionCommissionEntity,
          electoralRoll.commissionId,
        ),
        name: electoralRoll.name,
        revision: electoralRoll.revision,
        updatedAt: electoralRoll.updatedAt,
      },
    );
  }

  async saveMember(member: ElectoralRollMemberAggregate): Promise<void> {
    const { ElectoralRollEntity, ElectoralRollMemberEntity } =
      await getDatabaseEntities();
    await saveEntity(
      this.em,
      ElectoralRollMemberEntity,
      member.id,
      {
        createdAt: member.createdAt,
      },
      {
        electoralRoll: entityReference(
          this.em,
          ElectoralRollEntity,
          member.electoralRollId,
        ),
        identifier: member.identifier,
        groupKey: member.groupKey ?? null,
        voteWeight: member.voteWeight,
        updatedAt: member.updatedAt,
      },
    );
  }

  async removeMember(electoralRollId: string, memberId: string): Promise<void> {
    const { ElectoralRollMemberEntity } = await getDatabaseEntities();
    await this.em.nativeDelete(ElectoralRollMemberEntity as any, {
      id: memberId,
      electoralRoll: { id: electoralRollId },
    });
  }

  private toMember(
    entity: ElectoralRollMemberPersistence,
  ): ElectoralRollMemberAggregate {
    return ElectoralRollMemberAggregate.reconstitute({
      id: entity.id,
      electoralRollId: entity.electoralRoll.id,
      identifier: entity.identifier,
      groupKey: entity.groupKey ?? undefined,
      voteWeight: Number(entity.voteWeight),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
