import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { VoteElectorCountAccessPort } from '../../../../../../shared/application/port/capability/vote-elector-count-access.port';
import { getDatabaseEntities } from '../../../../../../platform/database/repository/database-repository.util';

@Injectable()
export class VoteElectorCountAccessAdapter implements VoteElectorCountAccessPort {
  constructor(private readonly em: EntityManager) {}

  async countEligibleElectors(voteId: string): Promise<number> {
    const { ElectorEntity } = await getDatabaseEntities();

    return this.em.count(ElectorEntity as any, {
      vote: { id: voteId },
      status: 'ELIGIBLE',
    });
  }
}
