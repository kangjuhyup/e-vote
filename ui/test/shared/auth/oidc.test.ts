import { describe, expect, it } from 'vitest';

import {
  buildTenantOidcIssuer,
  createEVoteOidcProvider,
  getTenantOidcIssuer,
  getVoteApiResource,
  mapEVoteProfileToUser,
} from '@/shared/auth/oidc';

describe('buildTenantOidcIssuer', () => {
  it('uses the e-vote tenant by default', () => {
    expect(getTenantOidcIssuer({})).toBe(
      'http://localhost:3000/t/e-vote/oidc',
    );
  });

  it('builds a tenant-scoped OIDC issuer from an origin and tenant code', () => {
    expect(
      buildTenantOidcIssuer({
        issuerOrigin: 'http://localhost:3000/',
        tenantCode: 'acme',
      }),
    ).toBe('http://localhost:3000/t/acme/oidc');
  });

  it('encodes tenant codes when composing the issuer path', () => {
    expect(
      buildTenantOidcIssuer({
        issuerOrigin: 'https://auth.example.com',
        tenantCode: 'tenant one',
      }),
    ).toBe('https://auth.example.com/t/tenant%20one/oidc');
  });
});

describe('getVoteApiResource', () => {
  it('uses the shared Vote API resource by default', () => {
    expect(getVoteApiResource({})).toBe('https://vote-api.example.com');
  });

  it('accepts an absolute resource URI override', () => {
    expect(
      getVoteApiResource({
        AUTH_E_VOTE_RESOURCE: 'https://api.example.com/vote/?version=1',
      }),
    ).toBe('https://api.example.com');
  });

  it('rejects non-HTTPS resource identifiers', () => {
    expect(() =>
      getVoteApiResource({ AUTH_E_VOTE_RESOURCE: 'vote-api' }),
    ).toThrow('AUTH_E_VOTE_RESOURCE must be an HTTPS origin');
    expect(() =>
      getVoteApiResource({
        AUTH_E_VOTE_RESOURCE: 'http://api.example.com',
      }),
    ).toThrow('AUTH_E_VOTE_RESOURCE must be an HTTPS origin');
  });
});

describe('production OIDC configuration', () => {
  const environment = {
    NODE_ENV: 'production',
    AUTH_SECRET: 'session-secret',
    AUTH_URL: 'https://vote.rvkang.app',
    AUTH_OIDC_ISSUER: 'https://auth.rvkang.app',
    AUTH_OIDC_TENANT_CODE: 'e-vote',
    AUTH_E_VOTE_RESOURCE: 'https://vote-api.rvkang.app',
    AUTH_E_VOTE_SECRET: 'web-client-secret',
  };

  it('uses the confidential e-vote web client and exact issuer', () => {
    const provider = createEVoteOidcProvider(environment);

    expect(provider.clientId).toBe('e-vote');
    expect(provider.client?.token_endpoint_auth_method).toBe('client_secret_basic');
    expect(provider.checks).toContain('pkce');
    expect(provider.issuer).toBe('https://auth.rvkang.app/t/e-vote/oidc');
    expect(provider.authorization.params.resource).toBe('https://vote-api.rvkang.app');
  });

  it.each([
    [{ AUTH_E_VOTE_SECRET: undefined }, 'AUTH_E_VOTE_SECRET'],
    [{ AUTH_URL: 'http://localhost:3001' }, 'AUTH_URL'],
    [{ AUTH_URL: 'https://other.example.org' }, 'AUTH_URL'],
    [{ AUTH_E_VOTE_RESOURCE: undefined }, 'AUTH_E_VOTE_RESOURCE'],
    [{ VOTE_AUTH_AUDIENCE: 'https://other.example.org' }, 'AUTH_E_VOTE_RESOURCE'],
    [{ AUTH_OIDC_ISSUER: 'http://localhost:3002' }, 'AUTH_OIDC_ISSUER'],
    [{ AUTH_OIDC_TENANT_CODE: 'acme' }, 'AUTH_OIDC_TENANT_CODE'],
  ])('rejects invalid production configuration', (overrides, field) => {
    expect(() =>
      createEVoteOidcProvider({ ...environment, ...overrides }),
    ).toThrow(field);
  });

  it('accepts the administrator host with the same e-vote client', () => {
    const provider = createEVoteOidcProvider({
      ...environment,
      AUTH_URL: 'https://vote-admin.rvkang.app',
    });

    expect(provider.clientId).toBe('e-vote');
  });
});

describe('mapEVoteProfileToUser', () => {
  it('maps ID token claims into an Auth.js user without exposing tokens', () => {
    expect(
      mapEVoteProfileToUser({
        sub: 'user-1',
        name: 'Kim User',
        email: 'kim@example.com',
      }),
    ).toEqual({
      id: 'user-1',
      name: 'Kim User',
      email: 'kim@example.com',
      image: null,
    });
  });

  it('falls back to email or subject when the display name is absent', () => {
    expect(
      mapEVoteProfileToUser({
        sub: 'user-2',
        email: 'fallback@example.com',
      }).name,
    ).toBe('fallback@example.com');

    expect(mapEVoteProfileToUser({ sub: 'user-3' }).name).toBe('user-3');
  });
});
