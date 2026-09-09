import { OrganizationOnboardingService } from '../../../src/modules/organization/application/organization-onboarding.service';
import {
  OrganizationApplicationAccessDeniedError,
  OrganizationProvisioningUnavailableError,
} from '../../../src/modules/organization/application/organization-onboarding.error';
import type { AuthOrganizationProvisioningPort } from '../../../src/modules/organization/application/port/gateway/auth-organization-provisioning.port';
import type { OrganizationApplicationRepositoryPort } from '../../../src/modules/organization/application/port/persistence/organization-application-repository.port';
import { OrganizationApplicationAggregate } from '../../../src/modules/organization/domain/organization-application.aggregate';
import { UserPrincipal } from '../../../src/shared/application/security/user-principal';

function application(status: 'PENDING' | 'PROVISIONING_FAILED' = 'PENDING') {
  return OrganizationApplicationAggregate.restore({
    id: 'application-1',
    tenantId: 'tenant-1',
    tenantCode: 'acme',
    applicantUserPrincipalId: 'applicant-1',
    organizationName: '동부센트레빌아파트',
    organizationManagementNumber: 'apt-2026-001',
    organizationType: 'APARTMENT',
    contactName: '김관리',
    status,
    submittedAt: new Date('2026-09-09T00:00:00.000Z'),
  });
}

function admin() {
  return UserPrincipal.of({
    id: 'admin-1',
    tenantId: 'tenant-1',
    tenantCode: 'acme',
    tenantRoles: [{ id: 'role-admin', code: 'vote-admin' }],
    scopes: ['tenant_roles'],
  });
}

describe('OrganizationOnboardingService', () => {
  it('provisions through Auth and stores the verified parent relationship', async () => {
    const started = application();
    const approved = OrganizationApplicationAggregate.restore({
      ...started.props,
      status: 'APPROVED',
    });
    const repository = {
      beginProvisioning: jest.fn().mockResolvedValue(started),
      markApproved: jest.fn().mockResolvedValue(approved),
    } as unknown as jest.Mocked<OrganizationApplicationRepositoryPort>;
    const auth = {
      provision: jest.fn().mockResolvedValue({
        organizationGroup: { id: 'org-1', code: 'apt-2026-001' },
        managerGroup: {
          id: 'managers-1',
          code: 'apt-2026-001.vote-managers',
          parentId: 'org-1',
        },
      }),
    } as jest.Mocked<AuthOrganizationProvisioningPort>;
    const service = new OrganizationOnboardingService(repository, auth);

    await service.approve(admin(), 'application-1');

    expect(auth.provision.mock.calls).toContainEqual([
      expect.objectContaining({ organizationManagementNumber: 'apt-2026-001' }),
    ]);
    expect(repository.markApproved.mock.calls).toContainEqual([
      expect.objectContaining({
        authOrganizationGroupId: 'org-1',
        authOrganizationGroupCode: 'apt-2026-001',
        authManagerGroupId: 'managers-1',
        authManagerParentGroupId: 'org-1',
      }),
    ]);
  });

  it('records a retryable failure without exposing the Auth error', async () => {
    const repository = {
      beginProvisioning: jest.fn().mockResolvedValue(application()),
      markProvisioningFailed: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<OrganizationApplicationRepositoryPort>;
    const auth = {
      provision: jest
        .fn()
        .mockRejectedValue(new Error('secret provider response')),
    } as jest.Mocked<AuthOrganizationProvisioningPort>;
    const service = new OrganizationOnboardingService(repository, auth);

    await expect(
      service.approve(admin(), 'application-1'),
    ).rejects.toBeInstanceOf(OrganizationProvisioningUnavailableError);
    expect(repository.markProvisioningFailed.mock.calls).toContainEqual([
      'application-1',
      'AUTH_PROVISIONING_FAILED',
    ]);
  });

  it('does not trust a vote-manager role for platform approval', async () => {
    const service = new OrganizationOnboardingService(
      {} as OrganizationApplicationRepositoryPort,
      {} as AuthOrganizationProvisioningPort,
    );
    const manager = UserPrincipal.of({
      id: 'manager-1',
      tenantId: 'tenant-1',
      tenantCode: 'acme',
      tenantRoles: [{ id: 'role-manager', code: 'vote-manager' }],
      scopes: ['tenant_roles'],
    });
    await expect(
      service.approve(manager, 'application-1'),
    ).rejects.toBeInstanceOf(OrganizationApplicationAccessDeniedError);
  });
});
