import { OidcAuthenticationConfig } from '../../../src/platform/authentication/oidc-authentication.config';

describe('OidcAuthenticationConfig', () => {
  it('derives tenant issuer and JWKS URI from the shared OIDC environment', () => {
    expect(
      OidcAuthenticationConfig.fromEnvironment({
        AUTH_OIDC_ISSUER: 'http://localhost:3002/',
        AUTH_OIDC_TENANT_CODE: 'tenant one',
      }),
    ).toMatchObject({
      issuer: 'http://localhost:3002/t/tenant%20one/oidc',
      jwksUri: 'http://localhost:3002/t/tenant%20one/oidc/jwks',
      audience: 'e-vote',
      tenantCode: 'tenant one',
    });
  });

  it('accepts explicit server-side issuer, JWKS, and audience overrides', () => {
    expect(
      OidcAuthenticationConfig.fromEnvironment({
        AUTH_OIDC_TENANT_CODE: 'acme',
        VOTE_AUTH_ISSUER: 'https://identity.example.com/oidc',
        VOTE_AUTH_JWKS_URI: 'https://keys.example.com/jwks.json',
        VOTE_AUTH_AUDIENCE: 'vote-api',
      }),
    ).toMatchObject({
      issuer: 'https://identity.example.com/oidc',
      jwksUri: 'https://keys.example.com/jwks.json',
      audience: 'vote-api',
      tenantCode: 'acme',
    });
  });

  it('rejects malformed absolute URLs', () => {
    expect(() =>
      OidcAuthenticationConfig.fromEnvironment({
        AUTH_OIDC_ISSUER: 'identity.example.com',
        AUTH_OIDC_TENANT_CODE: 'acme',
      }),
    ).toThrow('AUTH_OIDC_ISSUER must be an absolute HTTP(S) URL');
  });
});
