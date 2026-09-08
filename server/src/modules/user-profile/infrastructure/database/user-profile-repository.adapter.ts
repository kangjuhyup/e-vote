import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import {
  getDatabaseEntities,
  nextRepositoryId,
} from '../../../../platform/database/repository/database-repository.util';
import type { UserProfileRepositoryPort } from '../../application/port/user-profile-repository.port';
import {
  UserProfileAggregate,
  type UserProfileProps,
} from '../../domain/user-profile.aggregate';

@Injectable()
export class UserProfileRepositoryAdapter implements UserProfileRepositoryPort {
  constructor(private readonly em: EntityManager) {}
  nextId() {
    return nextRepositoryId();
  }

  async findByPrincipal(tenantCode: string, userPrincipalId: string) {
    const { UserProfileEntity } = await getDatabaseEntities();
    const row = (await this.em.findOne(UserProfileEntity as never, {
      tenantCode,
      userPrincipalId,
    })) as unknown as UserProfileProps | null;
    return row ? UserProfileAggregate.restore(row) : undefined;
  }

  async save(profile: UserProfileAggregate) {
    const { UserProfileEntity } = await getDatabaseEntities();
    const existing = await this.em.findOne(UserProfileEntity as never, {
      id: profile.props.id,
    });
    if (existing) Object.assign(existing, profile.props);
    else
      this.em.persist(
        this.em.create(UserProfileEntity as never, profile.props as never),
      );
    await this.em.flush();
    return profile;
  }
}
