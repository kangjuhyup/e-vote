export const ORGANIZATION_INVITATION_ROLES = ['MEMBER', 'MANAGER'] as const;
export type OrganizationInvitationRole =
  (typeof ORGANIZATION_INVITATION_ROLES)[number];
export type OrganizationInvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED';

export interface OrganizationInvitationProps {
  readonly id: string;
  readonly tenantId: string;
  readonly tenantCode: string;
  readonly organizationGroupId: string;
  readonly organizationGroupCode: string;
  readonly organizationName: string;
  readonly managerGroupId: string;
  readonly managerGroupCode: string;
  readonly contactType: 'EMAIL' | 'PHONE';
  readonly contactHash: string;
  readonly contactHint: string;
  readonly tokenHash: string;
  readonly role: OrganizationInvitationRole;
  readonly status: OrganizationInvitationStatus;
  readonly invitedByUserPrincipalId: string;
  readonly invitedAt: Date;
  readonly expiresAt: Date;
  readonly acceptedByUserPrincipalId?: string;
  readonly acceptedAt?: Date;
}

export class OrganizationInvitationAggregate {
  private constructor(readonly props: OrganizationInvitationProps) {}

  static create(
    props: Omit<OrganizationInvitationProps, 'status'>,
  ): OrganizationInvitationAggregate {
    if (props.expiresAt <= props.invitedAt) {
      throw new TypeError(
        'organization invitation expiry must be in the future',
      );
    }
    return new OrganizationInvitationAggregate({ ...props, status: 'PENDING' });
  }

  static restore(props: OrganizationInvitationProps) {
    return new OrganizationInvitationAggregate(props);
  }

  canBeAccepted(now: Date): boolean {
    return this.props.status === 'PENDING' && this.props.expiresAt > now;
  }
}
