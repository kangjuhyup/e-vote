import {
  AccessTokenVerificationUnavailableError,
  InvalidAccessTokenError,
} from '../../../src/shared/application/port/security/access-token-verifier.port';
import { OidcAuthenticationConfig } from '../../../src/platform/authentication/oidc-authentication.config';
import { createOidcTokenIntrospector } from '../../../src/platform/authentication/oidc-token-introspector';

describe('createOidcTokenIntrospector', () => {
  const now = 2_000_000_000_000;
  const nowSeconds = now / 1_000;
  const config = OidcAuthenticationConfig.of({
    issuer: 'https://identity.example.com/t/acme/oidc',
    introspectionUri:
      'https://identity.example.com/t/acme/oidc/token/introspection',
    audience: 'https://vote-api.example.com',
    tenantCode: 'acme',
    introspectionClientId: 'vote api',
    introspectionClientSecret: 'secret:value',
    timeoutMs: 1_500,
  });

  function activePayload(overrides: Record<string, unknown> = {}) {
    return {
      active: true,
      sub: 'user-1',
      iss: config.issuer,
      aud: ['https://another-api.example.com', config.audience],
      exp: nowSeconds + 60,
      nbf: nowSeconds - 60,
      tenant_id: 'tenant-id-1',
      preferred_username: 'kim',
      email: 'kim@example.com',
      roles: ['commission-admin'],
      scope: 'openid votes:write',
      ...overrides,
    };
  }

  it('posts the opaque token with resource-server authentication', async () => {
    let requestUrl: string | URL | Request | undefined;
    let requestInit: RequestInit | undefined;
    let callCount = 0;
    const fetcher = (
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      callCount += 1;
      requestUrl = input;
      requestInit = init;
      return Promise.resolve(
        new Response(JSON.stringify(activePayload()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    };
    const introspect = createOidcTokenIntrospector(config, fetcher, () => now);

    const result = await introspect('opaque-token');

    expect(result).toMatchObject({
      active: true,
      subject: 'user-1',
      issuer: config.issuer,
      audience: ['https://another-api.example.com', config.audience],
      expiresAt: nowSeconds + 60,
      tenantId: 'tenant-id-1',
      username: 'kim',
      email: 'kim@example.com',
      roles: ['commission-admin'],
      scopes: ['openid', 'votes:write'],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(callCount).toBe(1);
    expect(requestUrl).toBe(config.introspectionUri);
    expect(requestInit).toMatchObject({
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Basic ${Buffer.from('vote+api:secret%3Avalue').toString(
          'base64',
        )}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
    });
    expect((requestInit?.body as URLSearchParams).toString()).toBe(
      'token=opaque-token&token_type_hint=access_token',
    );
    expect(requestInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ['inactive', { active: false }],
    ['missing subject', { sub: undefined }],
    ['missing tenant', { tenant_id: undefined }],
    ['wrong issuer', { iss: 'https://attacker.example.com' }],
    ['wrong audience', { aud: 'https://another-api.example.com' }],
    ['expired', { exp: nowSeconds }],
    ['not active yet', { nbf: nowSeconds + 1 }],
  ])('rejects an %s token', async (_case, overrides) => {
    const payload =
      overrides.active === false ? overrides : activePayload(overrides);
    const fetcher = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 200 }),
      );
    const introspect = createOidcTokenIntrospector(config, fetcher, () => now);

    await expect(introspect('opaque-token')).rejects.toBeInstanceOf(
      InvalidAccessTokenError,
    );
  });

  it('rejects an empty token without contacting the auth server', async () => {
    const fetcher = jest.fn<typeof fetch>();
    const introspect = createOidcTokenIntrospector(config, fetcher);

    await expect(introspect(' ')).rejects.toBeInstanceOf(
      InvalidAccessTokenError,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed JSON contract', new Response('{"active":"yes"}')],
    ['HTTP failure', new Response('', { status: 401 })],
  ])('reports %s as verification unavailable', async (_case, response) => {
    const fetcher = jest.fn<typeof fetch>().mockResolvedValue(response);
    const introspect = createOidcTokenIntrospector(config, fetcher);

    await expect(introspect('opaque-token')).rejects.toBeInstanceOf(
      AccessTokenVerificationUnavailableError,
    );
  });

  it('reports network failures as verification unavailable', async () => {
    const fetcher = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('connection refused'));
    const introspect = createOidcTokenIntrospector(config, fetcher);

    await expect(introspect('opaque-token')).rejects.toBeInstanceOf(
      AccessTokenVerificationUnavailableError,
    );
  });
});
