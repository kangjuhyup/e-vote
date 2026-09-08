export const ORGANIZATION_APPLICATION_STATUSES = [
  'PENDING',
  'PROVISIONING',
  'APPROVED',
  'REJECTED',
  'PROVISIONING_FAILED',
] as const;

export type OrganizationApplicationStatus =
  (typeof ORGANIZATION_APPLICATION_STATUSES)[number];

export type OrganizationType =
  'APARTMENT' | 'ASSOCIATION' | 'COMPANY' | 'OTHER';

export interface OrganizationApplicationProps {
  readonly id: string;
  readonly tenantId: string;
  readonly tenantCode: string;
  readonly applicantUserPrincipalId: string;
  readonly organizationName: string;
  readonly organizationManagementNumber: string;
  readonly organizationType: OrganizationType;
  readonly contactName: string;
  readonly contactPhone?: string;
  readonly status: OrganizationApplicationStatus;
  readonly submittedAt: Date;
  readonly reviewerUserPrincipalId?: string;
  readonly reviewedAt?: Date;
  readonly rejectionReason?: string;
  readonly authOrganizationGroupId?: string;
  readonly authOrganizationGroupCode?: string;
  readonly authManagerGroupId?: string;
  readonly authManagerGroupCode?: string;
  readonly authManagerParentGroupId?: string;
  readonly provisioningError?: string;
}

export class OrganizationApplicationAggregate {
  private constructor(readonly props: OrganizationApplicationProps) {}

  static create(
    props: Omit<
      OrganizationApplicationProps,
      'organizationManagementNumber' | 'status'
    >,
  ): OrganizationApplicationAggregate {
    const name = props.organizationName.trim();
    if (!name) throw new TypeError('organization name must not be empty');
    return new OrganizationApplicationAggregate({
      ...props,
      organizationName: name,
      organizationManagementNumber: `org-${props.id}`,
      contactName: props.contactName.trim(),
      status: 'PENDING',
    });
  }

  static restore(props: OrganizationApplicationProps) {
    return new OrganizationApplicationAggregate(props);
  }
}
