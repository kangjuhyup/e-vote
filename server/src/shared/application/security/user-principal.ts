export interface UserPrincipalGroupRole {
  readonly id: string;
  readonly code: string;
}

export interface UserPrincipalTenantRole {
  readonly id: string;
  readonly code: string;
}

export interface UserPrincipalGroup {
  readonly id: string;
  readonly code: string;
  readonly parentId?: string;
  readonly roles: readonly UserPrincipalGroupRole[];
}

export interface ManagedOrganization {
  readonly id: string;
  readonly code: string;
}

export class UserPrincipal {
  private constructor(
    readonly id: string,
    readonly tenantId: string | undefined,
    readonly tenantCode: string | undefined,
    readonly username: string | undefined,
    readonly email: string | undefined,
    readonly tenantRoles: readonly UserPrincipalTenantRole[],
    readonly groups: readonly UserPrincipalGroup[],
    readonly scopes: readonly string[],
  ) {}

  static of(params: {
    id: string;
    tenantId?: string;
    tenantCode?: string;
    username?: string;
    email?: string;
    tenantRoles?: readonly UserPrincipalTenantRole[];
    groups?: readonly UserPrincipalGroup[];
    scopes?: readonly string[];
  }): UserPrincipal {
    if (params.id.trim().length === 0) {
      throw new TypeError('user principal id must not be empty');
    }

    return Object.freeze(
      new UserPrincipal(
        params.id,
        params.tenantId,
        params.tenantCode,
        params.username,
        params.email,
        Object.freeze(
          (params.tenantRoles ?? []).map((role) => Object.freeze({ ...role })),
        ),
        Object.freeze(
          (params.groups ?? []).map((group) =>
            Object.freeze({
              ...group,
              roles: Object.freeze(
                group.roles.map((role) => Object.freeze({ ...role })),
              ),
            }),
          ),
        ),
        Object.freeze([...(params.scopes ?? [])]),
      ),
    );
  }

  hasTenantRole(code: string): boolean {
    return (
      this.scopes.includes('tenant_roles') &&
      this.tenantRoles.some((role) => role.code === code)
    );
  }

  belongsToOrganization(input: {
    organizationGroupId: string;
    organizationGroupCode: string;
  }): boolean {
    return this.groups.some(
      (group) =>
        group.id === input.organizationGroupId &&
        group.code === input.organizationGroupCode &&
        group.parentId === undefined,
    );
  }

  organizationMemberships(): readonly ManagedOrganization[] {
    return this.groups
      .filter((group) => group.parentId === undefined)
      .map((group) => Object.freeze({ id: group.id, code: group.code }));
  }

  managesOrganization(input: {
    organizationGroupId: string;
    organizationGroupCode: string;
  }): boolean {
    const hasScopedManagerRole = this.groups.some(
      (group) =>
        group.parentId === input.organizationGroupId &&
        group.code === `${input.organizationGroupCode}.vote-managers` &&
        group.roles.some((role) => role.code === 'vote-manager'),
    );
    return this.belongsToOrganization(input) && hasScopedManagerRole;
  }

  managedOrganizations(): readonly ManagedOrganization[] {
    return this.groups
      .filter(
        (group) =>
          group.parentId === undefined &&
          this.managesOrganization({
            organizationGroupId: group.id,
            organizationGroupCode: group.code,
          }),
      )
      .map((group) => Object.freeze({ id: group.id, code: group.code }));
  }
}
