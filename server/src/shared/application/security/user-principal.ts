export class UserPrincipal {
  private constructor(
    readonly id: string,
    readonly tenantCode: string | undefined,
    readonly username: string | undefined,
    readonly email: string | undefined,
    readonly roles: readonly string[],
    readonly scopes: readonly string[],
  ) {}

  static of(params: {
    id: string;
    tenantCode?: string;
    username?: string;
    email?: string;
    roles?: readonly string[];
    scopes?: readonly string[];
  }): UserPrincipal {
    if (params.id.trim().length === 0) {
      throw new TypeError('user principal id must not be empty');
    }

    return Object.freeze(
      new UserPrincipal(
        params.id,
        params.tenantCode,
        params.username,
        params.email,
        Object.freeze([...(params.roles ?? [])]),
        Object.freeze([...(params.scopes ?? [])]),
      ),
    );
  }
}
