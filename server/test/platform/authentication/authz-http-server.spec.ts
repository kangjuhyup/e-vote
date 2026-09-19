import { type AddressInfo } from 'node:net';

import {
  AccessTokenVerificationUnavailableError,
  InvalidAccessTokenError,
  type AccessTokenVerifierPort,
} from '../../../src/shared/application/port/security/access-token-verifier.port';
import { UserPrincipal } from '../../../src/shared/application/security/user-principal';
import { verifyAuthzAssertion } from '../../../src/platform/authentication/authz-assertion';
import { createAuthzHttpServer } from '../../../src/platform/authentication/authz-http-server';

describe('Authz HTTP check service', () => {
  const key = 'test-authz-assertion-key-at-least-32-bytes';

  async function requestWith(
    verifier: AccessTokenVerifierPort,
    authorization?: string,
  ) {
    const server = createAuthzHttpServer(verifier, key);
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    try {
      const port = (server.address() as AddressInfo).port;
      return await fetch(`http://127.0.0.1:${port}/check`, {
        headers: authorization ? { authorization } : {},
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  }

  it('allows anonymous traffic for the API public-route guard', async () => {
    const verify = jest.fn();
    const response = await requestWith({ verify });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-vote-authz-assertion')).toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });

  it('returns a signed principal only after token verification', async () => {
    const principal = UserPrincipal.of({ id: 'user-1', tenantCode: 'e-vote' });
    const verify = jest.fn().mockResolvedValue(principal);
    const response = await requestWith({ verify }, 'Bearer opaque-token');
    expect(response.status).toBe(200);
    expect(verify).toHaveBeenCalledWith('opaque-token');
    expect(
      verifyAuthzAssertion(
        'opaque-token',
        response.headers.get('x-vote-authz-assertion') ?? undefined,
        key,
      ),
    ).toEqual(principal);
  });

  it('fails closed for malformed, invalid, and unavailable tokens', async () => {
    expect((await requestWith({ verify: jest.fn() }, 'Basic abc')).status).toBe(
      401,
    );
    expect(
      (
        await requestWith(
          {
            verify: jest.fn().mockRejectedValue(new InvalidAccessTokenError()),
          },
          'Bearer invalid',
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await requestWith(
          {
            verify: jest
              .fn()
              .mockRejectedValue(new AccessTokenVerificationUnavailableError()),
          },
          'Bearer unavailable',
        )
      ).status,
    ).toBe(503);
  });
});
