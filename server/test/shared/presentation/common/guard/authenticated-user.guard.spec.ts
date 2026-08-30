import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AccessTokenVerifierPort } from '../../../../../src/shared/application/port/security/access-token-verifier.port';
import { UserPrincipal } from '../../../../../src/shared/application/security/user-principal';
import { AuthenticatedUserGuard } from '../../../../../src/shared/presentation/common/guard/authenticated-user.guard';

type TestRequest = {
  headers: {
    authorization?: string | string[];
  };
  user?: UserPrincipal | { id: string };
};

function createExecutionContext(request: TestRequest): ExecutionContext {
  return {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthenticatedUserGuard', () => {
  const principal = UserPrincipal.of({
    id: 'user-1',
    tenantCode: 'acme',
    roles: ['commission-admin'],
    scopes: ['openid'],
  });

  it('skips authentication for public routes', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const verify = jest.fn();
    const verifier: AccessTokenVerifierPort = { verify };
    const request: TestRequest = { headers: {} };
    const guard = new AuthenticatedUserGuard(reflector, verifier);

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });

  it('verifies a bearer token and assigns the principal to request.user', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const verify = jest.fn().mockResolvedValue(principal);
    const verifier: AccessTokenVerifierPort = { verify };
    const request: TestRequest = {
      headers: { authorization: 'Bearer signed-access-token' },
      user: { id: 'untrusted-user' },
    };
    const guard = new AuthenticatedUserGuard(reflector, verifier);

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(verify).toHaveBeenCalledWith('signed-access-token');
    expect(request.user).toBe(principal);
  });

  it.each([
    undefined,
    '',
    'Basic credentials',
    'Bearer',
    'Bearer token extra',
    ['Bearer token'],
  ])('rejects an invalid authorization header: %p', async (authorization) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const verify = jest.fn();
    const verifier: AccessTokenVerifierPort = { verify };
    const request: TestRequest = {
      headers: { authorization },
      user: { id: 'untrusted-user' },
    };
    const guard = new AuthenticatedUserGuard(reflector, verifier);

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.user).toBeUndefined();
    expect(verify).not.toHaveBeenCalled();
  });

  it('fails closed when access-token verification fails', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const verifier: AccessTokenVerifierPort = {
      verify: jest.fn().mockRejectedValue(new Error('signature mismatch')),
    };
    const request: TestRequest = {
      headers: { authorization: 'Bearer invalid-token' },
      user: { id: 'untrusted-user' },
    };
    const guard = new AuthenticatedUserGuard(reflector, verifier);

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toMatchObject({
      message: 'invalid or expired access token',
    });
    expect(request.user).toBeUndefined();
  });
});
