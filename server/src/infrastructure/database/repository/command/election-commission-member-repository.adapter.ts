import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ElectionCommissionMemberRepositoryPort } from '../../../../application/port/persistence/command/election-commission-member-repository.port';
import type { ElectionCommissionMemberAggregate } from '../../../../domain/election-commission/election-commission-member.aggregate';
import {
  ElectionCommissionMemberMapper,
  type ElectionCommissionMemberPersistence,
} from '../../mapper/election-commission-member.mapper';
import {
  JOINED_RELATION_LOAD_OPTIONS,
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from '../database-repository.util';

const ELECTION_COMMISSION_MEMBER_RELATIONS = ['commission'] as const;

@Injectable()
export class ElectionCommissionMemberRepositoryAdapter implements ElectionCommissionMemberRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async findByIds(
    commissionId: string,
    memberIds: readonly string[],
  ): Promise<ElectionCommissionMemberAggregate[]> {
    if (memberIds.length === 0) {
      return [];
    }

    const { ElectionCommissionMemberEntity } = await getDatabaseEntities();
    const entities = (await this.em.find(
      ElectionCommissionMemberEntity as any,
      {
        id: { $in: [...memberIds] },
        commission: { id: commissionId },
      } as any,
      {
        populate: ELECTION_COMMISSION_MEMBER_RELATIONS,
        ...JOINED_RELATION_LOAD_OPTIONS,
      },
    )) as unknown as ElectionCommissionMemberPersistence[];
    const byId = new Map(entities.map((entity) => [entity.id, entity]));

    return memberIds
      .map((memberId) => byId.get(memberId))
      .filter((entity): entity is ElectionCommissionMemberPersistence =>
        Boolean(entity),
      )
      .map((entity) => ElectionCommissionMemberMapper.toDomain(entity));
  }

  async save(member: ElectionCommissionMemberAggregate): Promise<void> {
    const { ElectionCommissionEntity, ElectionCommissionMemberEntity } =
      await getDatabaseEntities();
    const now = new Date();

    await saveEntity(
      this.em,
      ElectionCommissionMemberEntity,
      member.id,
      {
        registeredAt: now,
      },
      {
        commission: entityReference(
          this.em,
          ElectionCommissionEntity,
          member.commissionId,
        ),
        name: member.name,
        role: member.role,
        status: member.status,
        updatedAt: now,
      },
    );
  }
}
