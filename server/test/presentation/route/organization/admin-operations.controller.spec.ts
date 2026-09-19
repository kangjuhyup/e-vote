import { ForbiddenException } from '@nestjs/common';
import { AdminOperationsController } from '../../../../src/modules/organization/presentation/organization-onboarding/admin-operations.controller';
import { UserPrincipal } from '../../../../src/shared/application/security/user-principal';

describe('admin operations access', () => {
  const execute = jest.fn().mockResolvedValue({ organizations: [] });
  const getOrdersPage = jest.fn().mockResolvedValue({ items: [] });
  const controller = new AdminOperationsController({
    execute,
    getOrdersPage,
  } as never);

  beforeEach(() => {
    execute.mockClear();
    getOrdersPage.mockClear();
  });

  it('reads only the administrator tenant', async () => {
    const user = UserPrincipal.of({
      id: 'admin',
      tenantId: 'tenant-a',
      scopes: ['tenant_roles'],
      tenantRoles: [{ id: 'role', code: 'vote-admin' }],
    });
    await expect(controller.getOverview(user)).resolves.toEqual({
      organizations: [],
    });
    expect(execute).toHaveBeenCalledWith('tenant-a');
  });

  it('rejects users without the administrator role', () => {
    const user = UserPrincipal.of({ id: 'member', tenantId: 'tenant-a' });
    expect(() => controller.getOverview(user)).toThrow(ForbiddenException);
    expect(execute).not.toHaveBeenCalled();
    expect(() =>
      controller.getOrdersPage(user, { page: 1, pageSize: 20 }),
    ).toThrow(ForbiddenException);
    expect(getOrdersPage).not.toHaveBeenCalled();
  });
});
