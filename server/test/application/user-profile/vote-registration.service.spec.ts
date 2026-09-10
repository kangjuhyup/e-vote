import type { AuthAccountRegistrationPort } from '../../../src/modules/user-profile/application/port/auth-account-registration.port';
import type { UserProfileService } from '../../../src/modules/user-profile/application/user-profile.service';
import { VoteRegistrationService } from '../../../src/modules/user-profile/application/vote-registration.service';

const input = {
  tenantCode: 'acme',
  username: 'voter01',
  password: 'password123',
  name: '김투표',
  email: 'voter@example.com',
  phone: '+821012345678',
};

describe('VoteRegistrationService', () => {
  it('creates the Auth account and stores the Vote profile', async () => {
    const authAccounts = {
      register: jest.fn().mockResolvedValue({ userPrincipalId: 'auth-user-1' }),
      remove: jest.fn(),
    } as jest.Mocked<AuthAccountRegistrationPort>;
    const profiles = {
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UserProfileService>;
    const service = new VoteRegistrationService(authAccounts, profiles);

    await service.register(input);

    expect(authAccounts.register.mock.calls).toContainEqual([input]);
    expect(profiles.save.mock.calls).toContainEqual([
      {
        tenantCode: 'acme',
        userPrincipalId: 'auth-user-1',
        name: '김투표',
        email: 'voter@example.com',
        phone: '+821012345678',
      },
    ]);
    expect(authAccounts.remove.mock.calls).toHaveLength(0);
  });

  it('removes the Auth account when Vote profile persistence fails', async () => {
    const authAccounts = {
      register: jest.fn().mockResolvedValue({ userPrincipalId: 'auth-user-1' }),
      remove: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<AuthAccountRegistrationPort>;
    const profiles = {
      save: jest.fn().mockRejectedValue(new Error('database unavailable')),
    } as unknown as jest.Mocked<UserProfileService>;
    const service = new VoteRegistrationService(authAccounts, profiles);

    await expect(service.register(input)).rejects.toThrow(
      'database unavailable',
    );
    expect(authAccounts.remove.mock.calls).toContainEqual([
      {
        tenantCode: 'acme',
        userPrincipalId: 'auth-user-1',
      },
    ]);
  });
});
