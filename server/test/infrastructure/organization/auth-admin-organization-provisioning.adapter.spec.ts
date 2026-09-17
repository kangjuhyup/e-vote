import { ConfigService } from '@nestjs/config';

import { AuthAdminOrganizationProvisioningAdapter } from '../../../src/modules/organization/infrastructure/auth/auth-admin-organization-provisioning.adapter';

describe('AuthAdminOrganizationProvisioningAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('blocks production organization provisioning before admin login', async () => {
    const fetcher = jest.spyOn(global, 'fetch');
    const adapter = new AuthAdminOrganizationProvisioningAdapter(
      new ConfigService({ NODE_ENV: 'production' }),
    );

    await expect(
      adapter.provision({
        tenantCode: 'e-vote',
        applicantUserId: 'user-1',
        organizationName: 'Organization',
        organizationManagementNumber: '100',
      }),
    ).rejects.toThrow('AUTH_ADMIN_PROVISIONING_NOT_CONFIGURED');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
