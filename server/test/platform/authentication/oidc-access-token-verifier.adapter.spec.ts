import { OidcAccessTokenVerifierAdapter } from '../../../src/platform/authentication/oidc-access-token-verifier.adapter';
import { OidcAuthenticationConfig } from '../../../src/platform/authentication/oidc-authentication.config';
import { OidcIntrospectTokenResult } from '../../../src/platform/authentication/oidc-introspect-token.result';
import type { OidcTokenIntrospector } from '../../../src/platform/authentication/oidc-token-introspector';
import { InvalidAccessTokenError } from '../../../src/shared/application/port/security/access-token-verifier.port';

describe('OidcAccessTokenVerifierAdapter', () => {
  const config = OidcAuthenticationConfig.of({
    issuer: 'https://identity.example.com/t/acme/oidc',
    introspectionUri:
      'https://identity.example.com/t/acme/oidc/token/introspection',
    audience: 'https://vote-api.example.com',
    tenantCode: 'acme',
    introspectionClientId: 'vote-api',
    introspectionClientSecret: 'secret',
    timeoutMs: 3_000,
  });

  it('maps introspected claims to an immutable UserPrincipal', async () => {
    const introspector: OidcTokenIntrospector = jest.fn().mockResolvedValue(
      OidcIntrospectTokenResult.of({
        active: true,
        sub: 'user-1',
        iss: config.issuer,
        aud: config.audience,
        exp: 2_000_000_000,
        tenant_id: 'tenant-id-1',
        preferred_username: 'kim',
        email: 'kim@example.com',
        tenant_roles: [{ id: 'tenant-role-1', code: 'vote-admin' }],
        groups: [
          {
            id: 'group-manager-1',
            code: 'vote-managers',
            parentId: 'group-organization-1',
            roles: [{ id: 'role-1', code: 'vote-manager' }],
          },
        ],
        scope: 'openid profile votes:write tenant_roles',
      }),
    );
    const adapter = new OidcAccessTokenVerifierAdapter(config, introspector);

    const principal = await adapter.verify('opaque-token');

    expect(introspector).toHaveBeenCalledWith('opaque-token');
    expect(principal).toEqual({
      id: 'user-1',
      tenantId: 'tenant-id-1',
      tenantCode: 'acme',
      username: 'kim',
      email: 'kim@example.com',
      tenantRoles: [{ id: 'tenant-role-1', code: 'vote-admin' }],
      groups: [
        {
          id: 'group-manager-1',
          code: 'vote-managers',
          parentId: 'group-organization-1',
          roles: [{ id: 'role-1', code: 'vote-manager' }],
        },
      ],
      scopes: ['openid', 'profile', 'votes:write', 'tenant_roles'],
    });
    expect(Object.isFrozen(principal)).toBe(true);
  });

  it('falls back to configured tenant and supports array scopes', async () => {
    const introspector: OidcTokenIntrospector = jest.fn().mockResolvedValue(
      OidcIntrospectTokenResult.of({
        active: true,
        sub: 'user-2',
        iss: config.issuer,
        aud: config.audience,
        exp: 2_000_000_000,
        tenant_id: 'tenant-id-1',
        username: 'lee',
        scp: ['votes:read'],
      }),
    );
    const adapter = new OidcAccessTokenVerifierAdapter(config, introspector);

    await expect(adapter.verify('opaque-token')).resolves.toMatchObject({
      id: 'user-2',
      tenantId: 'tenant-id-1',
      tenantCode: 'acme',
      username: 'lee',
      groups: [],
      scopes: ['votes:read'],
    });
  });

  it('rejects an introspection result without a subject', async () => {
    const introspector: OidcTokenIntrospector = jest.fn().mockResolvedValue(
      OidcIntrospectTokenResult.of({
        active: true,
        iss: config.issuer,
        aud: config.audience,
        exp: 2_000_000_000,
        tenant_id: 'tenant-id-1',
        scope: 'openid',
      }),
    );
    const adapter = new OidcAccessTokenVerifierAdapter(config, introspector);

    await expect(adapter.verify('opaque-token')).rejects.toBeInstanceOf(
      InvalidAccessTokenError,
    );
  });
});
