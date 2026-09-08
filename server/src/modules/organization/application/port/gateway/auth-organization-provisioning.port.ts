export const AUTH_ORGANIZATION_PROVISIONING_PORT = Symbol(
  'AUTH_ORGANIZATION_PROVISIONING_PORT',
);

export interface AuthOrganizationProvisioningResult {
  readonly organizationGroup: { readonly id: string; readonly code: string };
  readonly managerGroup: {
    readonly id: string;
    readonly code: string;
    readonly parentId: string;
  };
}

export interface AuthOrganizationProvisioningPort {
  provision(input: {
    tenantCode: string;
    applicantUserId: string;
    organizationName: string;
    organizationManagementNumber: string;
  }): Promise<AuthOrganizationProvisioningResult>;
}
