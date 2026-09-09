import { OrganizationInvitationAggregate } from '../../../src/modules/organization/domain/organization-invitation.aggregate';

describe('organization invitation policy', () => {
  const invitation = OrganizationInvitationAggregate.create({
    id: 'invite-1',
    tenantId: 'tenant-1',
    tenantCode: 'acme',
    organizationGroupId: 'org-1',
    organizationGroupCode: 'org-code',
    organizationName: '동부센트레빌아파트',
    managerGroupId: 'manager-1',
    managerGroupCode: 'org-code.vote-managers',
    contactType: 'EMAIL',
    contactHash: 'hash',
    contactHint: 'te***@example.com',
    tokenHash: 'token-hash',
    role: 'MEMBER',
    invitedByUserPrincipalId: 'manager-user',
    invitedAt: new Date('2026-09-09T00:00:00Z'),
    expiresAt: new Date('2026-09-16T00:00:00Z'),
  });

  it('allows a pending invitation before its expiry', () => {
    expect(invitation.canBeAccepted(new Date('2026-09-10T00:00:00Z'))).toBe(
      true,
    );
  });

  it('rejects an invitation at or after its expiry', () => {
    expect(invitation.canBeAccepted(new Date('2026-09-16T00:00:00Z'))).toBe(
      false,
    );
  });
});
