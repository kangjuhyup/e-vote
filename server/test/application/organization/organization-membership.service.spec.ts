import { ConfigService } from '@nestjs/config';

import { OrganizationMembershipService } from '../../../src/modules/organization/application/organization-membership.service';
import { OrganizationInvitationRecipientMismatchError } from '../../../src/modules/organization/application/organization-onboarding.error';
import type { AuthOrganizationProvisioningPort } from '../../../src/modules/organization/application/port/gateway/auth-organization-provisioning.port';
import type { OrganizationApplicationRepositoryPort } from '../../../src/modules/organization/application/port/persistence/organization-application-repository.port';
import type { OrganizationInvitationRepositoryPort } from '../../../src/modules/organization/application/port/persistence/organization-invitation-repository.port';
import { OrganizationApplicationAggregate } from '../../../src/modules/organization/domain/organization-application.aggregate';
import { OrganizationInvitationAggregate } from '../../../src/modules/organization/domain/organization-invitation.aggregate';
import { UserPrincipal } from '../../../src/shared/application/security/user-principal';

const organization = OrganizationApplicationAggregate.restore({
  id: 'application-1',
  tenantId: 'tenant-1',
  tenantCode: 'acme',
  applicantUserPrincipalId: 'owner',
  organizationName: '동부센트레빌아파트',
  organizationManagementNumber: 'org-code',
  organizationType: 'APARTMENT',
  contactName: '관리자',
  status: 'APPROVED',
  submittedAt: new Date(),
  authOrganizationGroupId: 'org-1',
  authOrganizationGroupCode: 'org-code',
  authManagerGroupId: 'managers-1',
  authManagerGroupCode: 'org-code.vote-managers',
  authManagerParentGroupId: 'org-1',
});
const manager = UserPrincipal.of({
  id: 'manager-user',
  tenantId: 'tenant-1',
  tenantCode: 'acme',
  groups: [
    { id: 'org-1', code: 'org-code', roles: [] },
    {
      id: 'managers-1',
      code: 'org-code.vote-managers',
      parentId: 'org-1',
      roles: [{ id: 'role-1', code: 'vote-manager' }],
    },
  ],
});

function setup() {
  const organizations = {
    findApprovedByOrganizationGroupId: jest
      .fn()
      .mockResolvedValue(organization),
  } as unknown as jest.Mocked<OrganizationApplicationRepositoryPort>;
  const invitations = {
    nextId: jest.fn().mockReturnValue('invite-1'),
    save: jest.fn(),
    findByTokenHash: jest.fn(),
    markAccepted: jest.fn(),
  } as unknown as jest.Mocked<OrganizationInvitationRepositoryPort>;
  const auth = {
    getUser: jest.fn(),
    addUserToOrganization: jest.fn(),
  } as unknown as jest.Mocked<AuthOrganizationProvisioningPort>;
  const config = {
    get: jest.fn().mockReturnValue('a-secure-test-secret'),
  } as unknown as ConfigService;
  return {
    service: new OrganizationMembershipService(
      organizations,
      invitations,
      auth,
      config,
    ),
    invitations,
    auth,
  };
}

describe('organization membership policy', () => {
  it('stores only a contact hash and masked hint when creating an invitation', async () => {
    const { service, invitations, auth } = setup();
    const result = await service.createInvitation(manager, {
      organizationGroupId: 'org-1',
      contact: 'member@example.com',
      role: 'MANAGER',
    });
    expect(result.token).not.toContain('member@example.com');
    const saved = invitations.save.mock.calls[0]?.[0];
    expect(saved?.props.contactHint).toBe('me***@example.com');
    expect(saved?.props.contactHash).not.toContain('member@example.com');
    expect(auth.addUserToOrganization.mock.calls).toHaveLength(0);
  });

  it('accepts a matching account and assigns both organization groups to a manager', async () => {
    const { service, invitations, auth } = setup();
    const created = await service.createInvitation(manager, {
      organizationGroupId: 'org-1',
      contact: 'member@example.com',
      role: 'MANAGER',
    });
    const stored = invitations.save.mock.calls[0]?.[0];
    if (!stored) throw new Error('expected a saved invitation');
    invitations.findByTokenHash.mockResolvedValue(stored);
    invitations.markAccepted.mockResolvedValue(
      OrganizationInvitationAggregate.restore({
        ...stored.props,
        status: 'ACCEPTED',
        acceptedByUserPrincipalId: 'member-1',
        acceptedAt: new Date(),
      }),
    );
    auth.getUser.mockResolvedValue({
      id: 'member-1',
      username: 'member',
      email: 'member@example.com',
      status: 'ACTIVE',
    });
    const recipient = UserPrincipal.of({
      id: 'member-1',
      tenantId: 'tenant-1',
      tenantCode: 'acme',
    });
    await service.acceptInvitation(recipient, created.token);
    expect(auth.addUserToOrganization.mock.calls).toContainEqual([
      {
        tenantCode: 'acme',
        userId: 'member-1',
        organizationGroupId: 'org-1',
        managerGroupId: 'managers-1',
      },
    ]);
  });

  it('rejects a logged-in account whose contact does not match the invitation', async () => {
    const { service, invitations, auth } = setup();
    const created = await service.createInvitation(manager, {
      organizationGroupId: 'org-1',
      contact: 'member@example.com',
      role: 'MEMBER',
    });
    const stored = invitations.save.mock.calls[0]?.[0];
    if (!stored) throw new Error('expected a saved invitation');
    invitations.findByTokenHash.mockResolvedValue(stored);
    auth.getUser.mockResolvedValue({
      id: 'other-1',
      username: 'other',
      email: 'other@example.com',
      status: 'ACTIVE',
    });
    await expect(
      service.acceptInvitation(
        UserPrincipal.of({
          id: 'other-1',
          tenantId: 'tenant-1',
          tenantCode: 'acme',
        }),
        created.token,
      ),
    ).rejects.toBeInstanceOf(OrganizationInvitationRecipientMismatchError);
    expect(auth.addUserToOrganization.mock.calls).toHaveLength(0);
  });
});
