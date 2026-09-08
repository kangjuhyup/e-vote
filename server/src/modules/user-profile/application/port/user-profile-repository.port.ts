import type { UserProfileAggregate } from '../../domain/user-profile.aggregate';

export const USER_PROFILE_REPOSITORY_PORT = Symbol(
  'USER_PROFILE_REPOSITORY_PORT',
);

export interface UserProfileRepositoryPort {
  nextId(): string;
  save(profile: UserProfileAggregate): Promise<UserProfileAggregate>;
  findByPrincipal(
    tenantCode: string,
    userPrincipalId: string,
  ): Promise<UserProfileAggregate | undefined>;
}
