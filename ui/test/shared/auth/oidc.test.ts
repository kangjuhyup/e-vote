import { describe, expect, it } from 'vitest';

import {
  buildTenantOidcIssuer,
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
