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
    props: Omit<OrganizationApplicationProps, 'status'>,
  ): OrganizationApplicationAggregate {
    const name = props.organizationName.trim();
    const managementNumber = props.organizationManagementNumber.trim();
    if (!name) throw new TypeError('organization name must not be empty');
    if (!/^[A-Za-z0-9_.-]+$/.test(managementNumber)) {
      throw new TypeError('organization management number is invalid');
    }
    return new OrganizationApplicationAggregate({
      ...props,
      organizationName: name,
      organizationManagementNumber: managementNumber,
      contactName: props.contactName.trim(),
      status: 'PENDING',
    });
  }

  static restore(props: OrganizationApplicationProps) {
    return new OrganizationApplicationAggregate(props);
  }
}
