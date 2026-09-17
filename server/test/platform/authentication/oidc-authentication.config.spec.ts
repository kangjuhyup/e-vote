import { OidcAuthenticationConfig } from '../../../src/platform/authentication/oidc-authentication.config';

describe('OidcAuthenticationConfig', () => {
  const productionEnvironment = {
    NODE_ENV: 'production',
    AUTH_OIDC_ISSUER: 'https://auth.rvkang.app',
    AUTH_OIDC_TENANT_CODE: 'e-vote',
    VOTE_AUTH_TENANT_ID: 'tenant-2',
    VOTE_AUTH_AUDIENCE: 'https://vote-api.rvkang.app',
    VOTE_AUTH_INTROSPECTION_CLIENT_SECRET: 'resource-secret',
  };

  it('requires the production e-vote issuer and explicit API audience', () => {
    expect(
      OidcAuthenticationConfig.fromEnvironment(productionEnvironment),
    ).toMatchObject({
      issuer: 'https://auth.rvkang.app/t/e-vote/oidc',
      audience: 'https://vote-api.rvkang.app',
      tenantId: 'tenant-2',
      introspectionClientId: 'vote-api',
    });
    expect(() =>
      OidcAuthenticationConfig.fromEnvironment({
        ...productionEnvironment,
        VOTE_AUTH_AUDIENCE: undefined,
      }),
    ).toThrow('VOTE_AUTH_AUDIENCE');
    expect(() =>
      OidcAuthenticationConfig.fromEnvironment({
        ...productionEnvironment,
        VOTE_AUTH_TENANT_ID: undefined,
      }),
    ).toThrow('VOTE_AUTH_TENANT_ID');
    expect(() =>
      OidcAuthenticationConfig.fromEnvironment({
        ...productionEnvironment,
        AUTH_OIDC_ISSUER: 'http://localhost:3002',
      }),
    ).toThrow('AUTH_OIDC_ISSUER');
  });
  it('uses the e-vote tenant by default', () => {
    expect(
      OidcAuthenticationConfig.fromEnvironment({
        VOTE_AUTH_INTROSPECTION_CLIENT_SECRET: 'secret',
      }),
    ).toMatchObject({
      issuer: 'http://localhost:3002/t/e-vote/oidc',
      tenantCode: 'e-vote',
    });
  });

  it('derives tenant issuer and introspection settings', () => {
    expect(
      OidcAuthenticationConfig.fromEnvironment({
        AUTH_OIDC_ISSUER: 'http://localhost:3002/',
        AUTH_OIDC_TENANT_CODE: 'tenant one',
        VOTE_AUTH_INTROSPECTION_CLIENT_SECRET: 'resource-server-secret',
      }),
    ).toMatchObject({
      issuer: 'http://localhost:3002/t/tenant%20one/oidc',
      introspectionUri:
        'http://localhost:3002/t/tenant%20one/oidc/token/introspection',
      audience: 'https://vote-api.example.com',
      tenantCode: 'tenant one',
      introspectionClientId: 'vote-api',
      introspectionClientSecret: 'resource-server-secret',
      timeoutMs: 3_000,
    });
  });

  it('accepts explicit server-side introspection overrides', () => {
    expect(
      OidcAuthenticationConfig.fromEnvironment({
        AUTH_OIDC_TENANT_CODE: 'acme',
        VOTE_AUTH_ISSUER: 'https://identity.example.com/oidc',
        VOTE_AUTH_INTROSPECTION_URI:
          'https://identity-internal.example.com/oauth/introspect',
        VOTE_AUTH_AUDIENCE: 'https://vote-api.example.com/v1',
        VOTE_AUTH_INTROSPECTION_CLIENT_ID: 'vote-resource-server',
        VOTE_AUTH_INTROSPECTION_CLIENT_SECRET: 'keep-whitespace-secret ',
        VOTE_AUTH_INTROSPECTION_TIMEOUT_MS: '1500',
      }),
    ).toMatchObject({
      issuer: 'https://identity.example.com/oidc',
      introspectionUri:
        'https://identity-internal.example.com/oauth/introspect',
      audience: 'https://vote-api.example.com',
      tenantCode: 'acme',
      introspectionClientId: 'vote-resource-server',
      introspectionClientSecret: 'keep-whitespace-secret ',
      timeoutMs: 1_500,
    });
  });

  it('rejects malformed absolute URLs', () => {
    expect(() =>
      OidcAuthenticationConfig.fromEnvironment({
        AUTH_OIDC_ISSUER: 'identity.example.com',
        AUTH_OIDC_TENANT_CODE: 'acme',
        VOTE_AUTH_INTROSPECTION_CLIENT_SECRET: 'secret',
      }),
    ).toThrow('AUTH_OIDC_ISSUER must be an absolute HTTP(S) URL');
  });

  it('requires confidential resource-server credentials', () => {
    expect(() =>
      OidcAuthenticationConfig.fromEnvironment({
        AUTH_OIDC_TENANT_CODE: 'acme',
      }),
    ).toThrow('introspectionClientSecret must not be empty');
  });

  it('rejects invalid introspection timeouts', () => {
    expect(() =>
      OidcAuthenticationConfig.fromEnvironment({
        AUTH_OIDC_TENANT_CODE: 'acme',
        VOTE_AUTH_INTROSPECTION_CLIENT_SECRET: 'secret',
        VOTE_AUTH_INTROSPECTION_TIMEOUT_MS: '0',
      }),
    ).toThrow('timeoutMs must be a positive integer');
  });

  it('requires an HTTPS Vote API audience', () => {
    expect(() =>
      OidcAuthenticationConfig.fromEnvironment({
        AUTH_OIDC_TENANT_CODE: 'acme',
        VOTE_AUTH_AUDIENCE: 'http://vote-api.example.com',
        VOTE_AUTH_INTROSPECTION_CLIENT_SECRET: 'secret',
      }),
    ).toThrow('audience must be an absolute HTTPS origin');
  });
});
