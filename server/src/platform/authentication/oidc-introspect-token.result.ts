type IntrospectionPayload = Readonly<Record<string, unknown>>;

export interface OidcIntrospectedGroupRole {
  readonly id: string;
  readonly code: string;
}

export interface OidcIntrospectedGroup {
  readonly id: string;
  readonly code: string;
  readonly parentId: string | null;
  readonly roles: readonly OidcIntrospectedGroupRole[];
}

function requirePayload(value: unknown): IntrospectionPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('OIDC introspection response must be an object');
  }

  return value as IntrospectionPayload;
}

function getOptionalString(
  payload: IntrospectionPayload,
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const value = payload[name];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new TypeError(`OIDC introspection ${name} must be a string`);
    }

    return value.trim();
  }

  return undefined;
}

function getOptionalStringArray(
  payload: IntrospectionPayload,
  name: string,
): readonly string[] {
  const value = payload[name];
  if (value === undefined) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    value.some(
      (entry) => typeof entry !== 'string' || entry.trim().length === 0,
    )
  ) {
    throw new TypeError(`OIDC introspection ${name} must be a string array`);
  }

  return value.map((entry) => (entry as string).trim());
}

function getAudience(payload: IntrospectionPayload): readonly string[] {
  const audience = payload.aud;
  if (audience === undefined) {
    return [];
  }
  if (typeof audience === 'string' && audience.trim().length > 0) {
    return [audience.trim()];
  }
  if (
    Array.isArray(audience) &&
    audience.every(
      (entry) => typeof entry === 'string' && entry.trim().length > 0,
    )
  ) {
    return audience.map((entry) => (entry as string).trim());
  }

  throw new TypeError(
    'OIDC introspection aud must be a string or string array',
  );
}

function getNumericDate(
  payload: IntrospectionPayload,
  name: string,
): number | undefined {
  const value = payload[name];
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`OIDC introspection ${name} must be a numeric date`);
  }

  return value as number;
}

function getScopes(payload: IntrospectionPayload): readonly string[] {
  const scope = payload.scope;
  if (scope !== undefined) {
    if (typeof scope !== 'string') {
      throw new TypeError('OIDC introspection scope must be a string');
    }

    return scope.split(/\s+/).filter(Boolean);
  }

  return getOptionalStringArray(payload, 'scp');
}

function requireGroupString(
  value: Readonly<Record<string, unknown>>,
  name: string,
): string {
  const item = value[name];
  if (typeof item !== 'string' || item.trim().length === 0) {
    throw new TypeError(`OIDC introspection groups.${name} must be a string`);
  }
  return item.trim();
}

function getGroups(
  payload: IntrospectionPayload,
): readonly OidcIntrospectedGroup[] {
  const groups = payload.groups;
  if (groups === undefined) return [];
  if (!Array.isArray(groups)) {
    throw new TypeError('OIDC introspection groups must be an array');
  }

  return groups.map((rawGroup) => {
    if (!rawGroup || typeof rawGroup !== 'object' || Array.isArray(rawGroup)) {
      throw new TypeError('OIDC introspection groups entry must be an object');
    }
    const group = rawGroup as Readonly<Record<string, unknown>>;
    const parentId = group.parentId;
    if (parentId !== null && typeof parentId !== 'string') {
      throw new TypeError(
        'OIDC introspection groups.parentId must be a string or null',
      );
    }
    if (!Array.isArray(group.roles)) {
      throw new TypeError('OIDC introspection groups.roles must be an array');
    }
    const roles = group.roles.map((rawRole) => {
      if (!rawRole || typeof rawRole !== 'object' || Array.isArray(rawRole)) {
        throw new TypeError(
          'OIDC introspection groups.roles entry must be an object',
        );
      }
      const role = rawRole as Readonly<Record<string, unknown>>;
      return Object.freeze({
        id: requireGroupString(role, 'id'),
        code: requireGroupString(role, 'code'),
      });
    });

    return Object.freeze({
      id: requireGroupString(group, 'id'),
      code: requireGroupString(group, 'code'),
      parentId: parentId === null ? null : parentId.trim(),
      roles: Object.freeze(roles),
    });
  });
}

export class OidcIntrospectTokenResult {
  private constructor(
    readonly active: boolean,
    readonly subject: string | undefined,
    readonly issuer: string | undefined,
    readonly audience: readonly string[],
    readonly expiresAt: number | undefined,
    readonly notBefore: number | undefined,
    readonly tenantId: string | undefined,
    readonly tenantCode: string | undefined,
    readonly username: string | undefined,
    readonly email: string | undefined,
    readonly roles: readonly string[],
    readonly groups: readonly OidcIntrospectedGroup[],
    readonly scopes: readonly string[],
  ) {}

  static of(value: unknown): OidcIntrospectTokenResult {
    const payload = requirePayload(value);
    if (typeof payload.active !== 'boolean') {
      throw new TypeError('OIDC introspection active must be a boolean');
    }

    if (!payload.active) {
      return Object.freeze(
        new OidcIntrospectTokenResult(
          false,
          undefined,
          undefined,
          Object.freeze([]),
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          Object.freeze([]),
          Object.freeze([]),
          Object.freeze([]),
        ),
      );
    }

    return Object.freeze(
      new OidcIntrospectTokenResult(
        true,
        getOptionalString(payload, 'sub'),
        getOptionalString(payload, 'iss'),
        Object.freeze([...getAudience(payload)]),
        getNumericDate(payload, 'exp'),
        getNumericDate(payload, 'nbf'),
        getOptionalString(payload, 'tenant_id'),
        getOptionalString(payload, 'tenant_code', 'tenantCode'),
        getOptionalString(payload, 'preferred_username', 'username', 'name'),
        getOptionalString(payload, 'email'),
        Object.freeze([...getOptionalStringArray(payload, 'roles')]),
        Object.freeze([...getGroups(payload)]),
        Object.freeze([...getScopes(payload)]),
      ),
    );
  }
}
