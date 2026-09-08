import { UserProfileService } from '../../../src/modules/user-profile/application/user-profile.service';
import type { UserProfileRepositoryPort } from '../../../src/modules/user-profile/application/port/user-profile-repository.port';
import type { UserProfileAggregate } from '../../../src/modules/user-profile/domain/user-profile.aggregate';

describe('UserProfileService', () => {
  it('creates a Vote profile for an authenticated account identity', async () => {
    const save = jest.fn<Promise<UserProfileAggregate>, [UserProfileAggregate]>(
      (profile) => Promise.resolve(profile),
    );
    const repository = {
      nextId: jest.fn().mockReturnValue('profile-1'),
      findByPrincipal: jest.fn().mockResolvedValue(undefined),
      save,
    } as unknown as UserProfileRepositoryPort;
    const service = new UserProfileService(repository);

    const profile = await service.save({
      tenantCode: 'acme',
      userPrincipalId: 'user-1',
      name: '김투표',
      email: 'voter@example.com',
      phone: '+821012345678',
    });

    expect(profile.props).toMatchObject({
      id: 'profile-1',
      tenantCode: 'acme',
      userPrincipalId: 'user-1',
    });
    expect(save).toHaveBeenCalledTimes(1);
  });
});
