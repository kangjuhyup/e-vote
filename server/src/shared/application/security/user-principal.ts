export interface UserPrincipalGroupRole {
  readonly id: string;
  readonly code: string;
}

export interface UserPrincipalGroup {
  readonly id: string;
  readonly code: string;
  readonly parentId?: string;
  readonly roles: readonly UserPrincipalGroupRole[];
}

export class UserPrincipal {
  private constructor(
    readonly id: string,
    readonly tenantId: string | undefined,
    readonly tenantCode: string | undefined,
    readonly username: string | undefined,
    readonly email: string | undefined,
    readonly roles: readonly string[],
    readonly groups: readonly UserPrincipalGroup[],
    readonly scopes: readonly string[],
  ) {}

  static of(params: {
    id: string;
    tenantId?: string;
    tenantCode?: string;
    username?: string;
    email?: string;
    roles?: readonly string[];
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
        Object.freeze([...(params.roles ?? [])]),
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

  managesOrganization(input: {
    organizationGroupId: string;
    organizationGroupCode: string;
  }): boolean {
    const belongsToOrganization = this.groups.some(
      (group) =>
        group.id === input.organizationGroupId &&
        group.code === input.organizationGroupCode &&
        group.parentId === undefined,
    );
    const hasScopedManagerRole = this.groups.some(
      (group) =>
        group.parentId === input.organizationGroupId &&
        group.code === `${input.organizationGroupCode}.vote-managers` &&
        group.roles.some((role) => role.code === 'vote-manager'),
    );
    return belongsToOrganization && hasScopedManagerRole;
  }
}
