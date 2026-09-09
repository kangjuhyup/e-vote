import { EntityManager, LockMode } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

import {
  getDatabaseEntities,
  nextRepositoryId,
} from '../../../../../platform/database/repository/database-repository.util';
import { OrganizationInvitationNotFoundError } from '../../../application/organization-onboarding.error';
import type { OrganizationInvitationRepositoryPort } from '../../../application/port/persistence/organization-invitation-repository.port';
import {
  OrganizationInvitationAggregate,
  type OrganizationInvitationProps,
} from '../../../domain/organization-invitation.aggregate';

type Row = {
  -readonly [
    Key in keyof OrganizationInvitationProps
  ]: OrganizationInvitationProps[Key];
} & {
  acceptedByUserPrincipalId: string | null;
  acceptedAt: Date | null;
  updatedAt: Date;
};

@Injectable()
export class OrganizationInvitationRepositoryAdapter implements OrganizationInvitationRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId() {
    return nextRepositoryId();
  }

  async save(invitation: OrganizationInvitationAggregate): Promise<void> {
    const { OrganizationInvitationEntity } = await getDatabaseEntities();
    const entity = this.em.create(
      OrganizationInvitationEntity as never,
      {
        ...invitation.props,
        acceptedByUserPrincipalId:
          invitation.props.acceptedByUserPrincipalId ?? null,
        acceptedAt: invitation.props.acceptedAt ?? null,
        updatedAt: new Date(),
      } as never,
    );
    this.em.persist(entity);
    await this.em.flush();
  }

  async findByTokenHash(tokenHash: string) {
    const { OrganizationInvitationEntity } = await getDatabaseEntities();
    const row = (await this.em.findOne(OrganizationInvitationEntity as never, {
      tokenHash,
    })) as unknown as Row | null;
    return row ? this.toDomain(row) : undefined;
  }

  async markAccepted(input: {
    id: string;
    userPrincipalId: string;
    acceptedAt: Date;
  }) {
    return this.em.transactional(async (em) => {
      const { OrganizationInvitationEntity } = await getDatabaseEntities();
      const row = (await em.findOne(
        OrganizationInvitationEntity as never,
        { id: input.id },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      )) as unknown as Row | null;
      if (!row) throw new OrganizationInvitationNotFoundError();
      if (row.status === 'PENDING') {
        row.status = 'ACCEPTED';
        row.acceptedByUserPrincipalId = input.userPrincipalId;
        row.acceptedAt = input.acceptedAt;
        row.updatedAt = new Date();
        await em.flush();
      }
      return this.toDomain(row);
    });
  }

  async findPage(input: {
    tenantId: string;
    organizationGroupId: string;
    page: number;
    pageSize: number;
  }) {
    const { OrganizationInvitationEntity } = await getDatabaseEntities();
    const [rows, totalItems] = (await this.em.findAndCount(
      OrganizationInvitationEntity as never,
      {
        tenantId: input.tenantId,
        organizationGroupId: input.organizationGroupId,
      },
      {
        limit: input.pageSize,
        offset: (input.page - 1) * input.pageSize,
        orderBy: { invitedAt: 'desc' },
      } as never,
    )) as unknown as [Row[], number];
    return {
      items: rows.map((row) => this.toDomain(row)),
      page: input.page,
      pageSize: input.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / input.pageSize),
    };
  }

  private toDomain(row: Row) {
    return OrganizationInvitationAggregate.restore({
      ...row,
      acceptedByUserPrincipalId: row.acceptedByUserPrincipalId ?? undefined,
      acceptedAt: row.acceptedAt ?? undefined,
    });
  }
}
