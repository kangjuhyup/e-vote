import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ElectionCommissionMembershipAccessPort } from '../../../../../../shared/application/port/capability/election-commission-membership-access.port';
import { getDatabaseEntities } from '../../../../../../platform/database/repository/database-repository.util';

@Injectable()
export class ElectionCommissionMembershipAccessAdapter implements ElectionCommissionMembershipAccessPort {
  constructor(private readonly em: EntityManager) {}

  async isActiveMember(
    commissionId: string,
    userPrincipalId: string,
  ): Promise<boolean> {
    const { ElectionCommissionMemberEntity } = await getDatabaseEntities();
    const member = await this.em.findOne(
      ElectionCommissionMemberEntity as any,
      {
        commission: { id: commissionId, deletedAt: null, status: 'ACTIVE' },
        userPrincipalId,
        status: 'ACTIVE',
      },
    );

    return member !== null;
  }
}
