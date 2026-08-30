import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { UserPrincipal } from '../../../src/shared/application/security/user-principal';
import {
  getUserPrincipal,
  User,
} from '../../../src/shared/presentation/common/decorator/user.decorator';

type UserDecoratorFactory = (
  data: unknown,
  context: ExecutionContext,
) => UserPrincipal;

type UserDecoratorMetadata = {
  readonly factory: UserDecoratorFactory;
};

class UserAwareController {
  handle(@User() user: UserPrincipal): UserPrincipal {
    return user;
  }
}

function getUserDecoratorFactory(): UserDecoratorFactory {
  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    UserAwareController,
    'handle',
  ) as unknown as Record<string, UserDecoratorMetadata> | undefined;
  const definition = Object.values(metadata ?? {})[0];

  if (!definition) {
    throw new Error('User decorator metadata is not available');
  }

  return definition.factory;
}

function createHttpContext(user?: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

describe('User decorator', () => {
  it('returns the authenticated user principal from the HTTP request', () => {
    const principal = UserPrincipal.of({
      id: 'user-1',
      tenantCode: 'acme',
      username: 'admin',
      email: 'admin@example.com',
      roles: ['ADMIN'],
      scopes: ['openid', 'profile'],
    });

    const userDecoratorFactory = getUserDecoratorFactory();

    expect(userDecoratorFactory(undefined, createHttpContext(principal))).toBe(
      principal,
    );
  });

  it.each([undefined, { id: 'unvalidated-user' }])(
    'rejects a request without a validated user principal',
    (user) => {
      expect(() => getUserPrincipal(createHttpContext(user))).toThrow(
        UnauthorizedException,
      );
    },
  );
});

describe('UserPrincipal', () => {
  it('is initialized through of and defensively copies authorities', () => {
    const roles = ['ADMIN'];
    const scopes = ['openid'];
    const principal = UserPrincipal.of({
      id: 'user-1',
      roles,
      scopes,
    });

    roles.push('FIELD_MANAGER');
    scopes.push('email');

    expect(principal).toMatchObject({
      id: 'user-1',
      roles: ['ADMIN'],
      scopes: ['openid'],
    });
    expect(Object.isFrozen(principal.roles)).toBe(true);
    expect(Object.isFrozen(principal.scopes)).toBe(true);
    expect(Object.isFrozen(principal)).toBe(true);
  });

  it('rejects an empty principal id', () => {
    expect(() => UserPrincipal.of({ id: ' ' })).toThrow(TypeError);
  });
});
