import { InvalidAccessTokenError } from '../../../src/shared/application/port/security/access-token-verifier.port';
import { UserPrincipal } from '../../../src/shared/application/security/user-principal';
import {
  issueAuthzAssertion,
  requireAuthzAssertionKey,
  verifyAuthzAssertion,
} from '../../../src/platform/authentication/authz-assertion';

describe('Authz assertion', () => {
  const key = 'test-authz-assertion-key-at-least-32-bytes';
  const principal = UserPrincipal.of({
    id: 'user-1',
    tenantId: '1',
    tenantCode: 'e-vote',
    tenantRoles: [{ id: 'role-1', code: 'vote-admin' }],
    groups: [{ id: 'group-1', code: 'org', roles: [] }],
    scopes: ['openid', 'tenant_roles'],
  });
  const now = 1_700_000_000_000;

  it('restores the exact verified principal for the bound bearer token', () => {
    const assertion = issueAuthzAssertion('opaque-token', principal, key, now);

    expect(
      verifyAuthzAssertion('opaque-token', assertion, key, now + 1_000),
    ).toEqual(principal);
  });

  it('rejects missing, tampered, replayed, and expired assertions', () => {
    const assertion = issueAuthzAssertion('opaque-token', principal, key, now);
    const cases = [
      [undefined, 'opaque-token', now],
      [assertion, 'another-token', now],
      [assertion, 'opaque-token', now + 16_000],
      [`${assertion.slice(0, -1)}x`, 'opaque-token', now],
    ] as const;
    for (const [candidate, token, at] of cases) {
      expect(() => verifyAuthzAssertion(token, candidate, key, at)).toThrow(
        InvalidAccessTokenError,
      );
    }
  });

  it('requires a 32-byte shared signing key', () => {
    expect(() => requireAuthzAssertionKey({})).toThrow();
    expect(() =>
      requireAuthzAssertionKey({ VOTE_AUTHZ_ASSERTION_KEY: 'short' }),
    ).toThrow();
    expect(requireAuthzAssertionKey({ VOTE_AUTHZ_ASSERTION_KEY: key })).toBe(
      key,
    );
  });
});
