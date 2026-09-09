import { Logger } from '@nestjs/common';
import { OrganizationOnboardingService } from '../../../../src/modules/organization/application/organization-onboarding.service';
import { OrganizationOnboardingController } from '../../../../src/modules/organization/presentation/organization-onboarding/organization-onboarding.controller';
import { UserPrincipal } from '../../../../src/shared/application/security/user-principal';

describe('OrganizationOnboardingController', () => {
  it.each([
    [[{ id: 'role-admin', code: 'vote-admin' }], true],
    [[{ id: 'role-manager', code: 'vote-manager' }], false],
  ])(
    'returns the vote administration capability for tenant roles %j',
    async (tenantRoles, voteAdmin) => {
      const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
      const service = {
        getMemberships: jest.fn().mockResolvedValue([]),
      } as unknown as jest.Mocked<OrganizationOnboardingService>;
      const controller = new OrganizationOnboardingController(service);
      const user = UserPrincipal.of({
        id: 'user-1',
        tenantId: 'tenant-1',
        tenantCode: 'acme',
        tenantRoles,
        scopes: ['tenant_roles'],
      });

      await expect(controller.getMemberships(user)).resolves.toEqual({
        items: [],
        voteAdmin,
      });
      expect(log).toHaveBeenCalledWith(
        `organization access resolved userPrincipalId=user-1 tenantId=tenant-1 tenantRoles=${tenantRoles.map((role) => role.code).join(',')} voteAdmin=${voteAdmin}`,
      );
      log.mockRestore();
    },
  );
});
