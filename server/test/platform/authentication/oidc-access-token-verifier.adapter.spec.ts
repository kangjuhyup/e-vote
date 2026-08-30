import type { JWTPayload } from 'jose';
import { OidcAccessTokenVerifierAdapter } from '../../../src/platform/authentication/oidc-access-token-verifier.adapter';
import { OidcAuthenticationConfig } from '../../../src/platform/authentication/oidc-authentication.config';
import type { OidcJwtVerifier } from '../../../src/platform/authentication/oidc-jwt-verifier';

describe('OidcAccessTokenVerifierAdapter', () => {
  const config = OidcAuthenticationConfig.of({
    issuer: 'https://identity.example.com/t/acme/oidc',
    jwksUri: 'https://identity.example.com/t/acme/oidc/jwks',
    audience: 'e-vote',
    tenantCode: 'acme',
  });

  it('maps verified claims to an immutable UserPrincipal', async () => {
    const verifier: OidcJwtVerifier = jest.fn().mockResolvedValue({
      sub: 'user-1',
      tenant_code: 'tenant-from-token',
      preferred_username: 'kim',
      email: 'kim@example.com',
      roles: ['commission-admin', 1],
      scope: 'openid profile votes:write',
    } satisfies JWTPayload);
    const adapter = new OidcAccessTokenVerifierAdapter(config, verifier);

    const principal = await adapter.verify('signed-token');

    expect(verifier).toHaveBeenCalledWith('signed-token');
    expect(principal).toEqual({
      id: 'user-1',
      tenantCode: 'tenant-from-token',
      username: 'kim',
      email: 'kim@example.com',
      roles: ['commission-admin'],
      scopes: ['openid', 'profile', 'votes:write'],
    });
    expect(Object.isFrozen(principal)).toBe(true);
  });

  it('falls back to configured tenant and supports array scopes', async () => {
    const verifier: OidcJwtVerifier = jest.fn().mockResolvedValue({
      sub: 'user-2',
      username: 'lee',
      scp: ['votes:read', 3],
    } satisfies JWTPayload);
    const adapter = new OidcAccessTokenVerifierAdapter(config, verifier);

    await expect(adapter.verify('signed-token')).resolves.toMatchObject({
      id: 'user-2',
      tenantCode: 'acme',
      username: 'lee',
      scopes: ['votes:read'],
    });
  });

  it('rejects a verified payload without a subject', async () => {
    const verifier: OidcJwtVerifier = jest.fn().mockResolvedValue({
      scope: 'openid',
    } satisfies JWTPayload);
    const adapter = new OidcAccessTokenVerifierAdapter(config, verifier);

    await expect(adapter.verify('signed-token')).rejects.toThrow(
      'verified access token subject is missing',
    );
  });
});
