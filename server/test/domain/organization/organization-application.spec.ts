import { OrganizationApplicationAggregate } from '../../../src/modules/organization/domain/organization-application.aggregate';
import { UserPrincipal } from '../../../src/shared/application/security/user-principal';

describe('organization onboarding policy', () => {
  it('assigns a stable organization management number on the server', () => {
    const application = OrganizationApplicationAggregate.create({
      id: 'application-1',
      tenantId: 'tenant-1',
      tenantCode: 'acme',
      applicantUserPrincipalId: 'user-1',
      organizationName: ' 동부센트레빌아파트 ',
      organizationType: 'APARTMENT',
      contactName: '김관리',
      submittedAt: new Date('2026-09-09T00:00:00.000Z'),
    });
    expect(application.props.organizationName).toBe('동부센트레빌아파트');
    expect(application.props.organizationManagementNumber).toBe(
      'org-application-1',
    );
    expect(application.props.status).toBe('PENDING');
  });

  it('requires direct organization membership and a child manager role together', () => {
    const principal = UserPrincipal.of({
      id: 'user-1',
      tenantId: 'tenant-1',
      tenantCode: 'acme',
      groups: [
        { id: 'org-1', code: 'apt-2026-001', roles: [] },
        {
          id: 'managers-1',
          code: 'apt-2026-001.vote-managers',
          parentId: 'org-1',
          roles: [{ id: 'role-1', code: 'vote-manager' }],
        },
      ],
    });
    expect(
      principal.managesOrganization({
        organizationGroupId: 'org-1',
        organizationGroupCode: 'apt-2026-001',
      }),
    ).toBe(true);
    expect(
      principal.managesOrganization({
        organizationGroupId: 'org-2',
        organizationGroupCode: 'apt-2026-001',
      }),
    ).toBe(false);
  });
});
