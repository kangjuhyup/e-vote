import { Inject, Injectable } from '@nestjs/common';
import { UserProfileAggregate } from '../domain/user-profile.aggregate';
import {
  USER_PROFILE_REPOSITORY_PORT,
  type UserProfileRepositoryPort,
} from './port/user-profile-repository.port';

export interface SaveUserProfileInput {
  tenantCode: string;
  userPrincipalId: string;
  name: string;
  email: string;
  phone: string;
}

@Injectable()
export class UserProfileService {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY_PORT)
    private readonly profiles: UserProfileRepositoryPort,
  ) {}

  async save(input: SaveUserProfileInput) {
    const existing = await this.profiles.findByPrincipal(
      input.tenantCode,
      input.userPrincipalId,
    );
    const now = new Date();
    return this.profiles.save(
      UserProfileAggregate.create({
        ...input,
        id: existing?.props.id ?? this.profiles.nextId(),
        createdAt: existing?.props.createdAt ?? now,
        updatedAt: now,
      }),
    );
  }

  findMine(tenantCode: string, userPrincipalId: string) {
    return this.profiles.findByPrincipal(tenantCode, userPrincipalId);
  }
}
