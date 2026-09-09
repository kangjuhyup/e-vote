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
  getUser(input: {
    tenantCode: string;
    userId: string;
  }): Promise<AuthOrganizationUser | undefined>;
  addUserToOrganization(input: {
    tenantCode: string;
    userId: string;
    organizationGroupId: string;
    managerGroupId?: string;
  }): Promise<void>;
}

export interface AuthOrganizationUser {
  readonly id: string;
  readonly username: string;
  readonly email?: string;
  readonly phone?: string;
  readonly status: string;
}
