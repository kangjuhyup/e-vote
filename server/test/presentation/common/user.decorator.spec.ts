import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
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

function collectControllerFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return collectControllerFiles(path);
    }

    return path.endsWith('.controller.ts') ? [path] : [];
  });
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

  it('requires a validated principal on every business route', () => {
    const controllerFiles = collectControllerFiles(
      join(process.cwd(), 'src', 'modules'),
    );
    let routeCount = 0;

    for (const file of controllerFiles) {
      const source = readFileSync(file, 'utf8');
      if (source.includes('@Public()')) continue;
      const fileRouteCount = (
        source.match(/@(Get|Post|Put|Patch|Delete)\b/g) ?? []
      ).length;
      const principalCount = (
        source.match(/@User\(\) user: UserPrincipal/g) ?? []
      ).length;

      expect({
        controller: relative(process.cwd(), file),
        principalCount,
      }).toEqual({
        controller: relative(process.cwd(), file),
        principalCount: fileRouteCount,
      });
      routeCount += fileRouteCount;
    }

    expect(routeCount).toBeGreaterThan(0);
  });
});

describe('UserPrincipal', () => {
  it('is initialized through of and defensively copies authorities', () => {
    const roles = ['ADMIN'];
    const scopes = ['openid'];
    const principal = UserPrincipal.of({
      id: 'user-1',
      tenantId: 'tenant-id-1',
      roles,
      scopes,
    });

    roles.push('FIELD_MANAGER');
    scopes.push('email');

    expect(principal).toMatchObject({
      id: 'user-1',
      tenantId: 'tenant-id-1',
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
