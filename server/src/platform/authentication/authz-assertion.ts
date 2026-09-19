import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { InvalidAccessTokenError } from '../../shared/application/port/security/access-token-verifier.port';
import { UserPrincipal } from '../../shared/application/security/user-principal';

const ASSERTION_LIFETIME_SECONDS = 15;

type AssertionPayload = {
  readonly tokenHash: string;
  readonly expiresAt: number;
  readonly principal: UserPrincipal;
};

export function requireAuthzAssertionKey(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const key = environment.VOTE_AUTHZ_ASSERTION_KEY?.trim();
  if (!key || Buffer.byteLength(key, 'utf8') < 32) {
    throw new TypeError(
      'VOTE_AUTHZ_ASSERTION_KEY must contain at least 32 bytes',
    );
  }
  return key;
}

function tokenHash(accessToken: string): string {
  return createHash('sha256').update(accessToken).digest('base64url');
}

function signature(payload: string, key: string): Buffer {
  return createHmac('sha256', key).update(`v1.${payload}`).digest();
}

export function issueAuthzAssertion(
  accessToken: string,
  principal: UserPrincipal,
  key: string,
  now: number = Date.now(),
): string {
  const payload: AssertionPayload = {
    tokenHash: tokenHash(accessToken),
    expiresAt: Math.floor(now / 1_000) + ASSERTION_LIFETIME_SECONDS,
    principal,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `v1.${encoded}.${signature(encoded, key).toString('base64url')}`;
}

function isRole(value: unknown): value is { id: string; code: string } {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { code?: unknown }).code === 'string'
  );
}

function isGroup(value: unknown): value is {
  id: string;
  code: string;
  parentId?: string;
  roles: { id: string; code: string }[];
} {
  if (!isRole(value)) return false;
  const group = value as { parentId?: unknown; roles?: unknown };
  return (
    (group.parentId === undefined || typeof group.parentId === 'string') &&
    Array.isArray(group.roles) &&
    group.roles.every(isRole)
  );
}

function restorePrincipal(value: unknown): UserPrincipal {
  if (!value || typeof value !== 'object') throw new InvalidAccessTokenError();
  const principal = value as Record<string, unknown>;
  if (
    typeof principal.id !== 'string' ||
    !principal.id.trim() ||
    (principal.tenantId !== undefined &&
      typeof principal.tenantId !== 'string') ||
    (principal.tenantCode !== undefined &&
      typeof principal.tenantCode !== 'string') ||
    (principal.username !== undefined &&
      typeof principal.username !== 'string') ||
    (principal.email !== undefined && typeof principal.email !== 'string') ||
    !Array.isArray(principal.tenantRoles) ||
    !principal.tenantRoles.every(isRole) ||
    !Array.isArray(principal.scopes) ||
    !principal.scopes.every((scope: unknown) => typeof scope === 'string') ||
    !Array.isArray(principal.groups) ||
    !principal.groups.every(isGroup)
  ) {
    throw new InvalidAccessTokenError();
  }
  return UserPrincipal.of({
    id: principal.id,
    tenantId: principal.tenantId,
    tenantCode: principal.tenantCode,
    username: principal.username,
    email: principal.email,
    tenantRoles: principal.tenantRoles,
    groups: principal.groups,
    scopes: principal.scopes,
  });
}

export function verifyAuthzAssertion(
  accessToken: string,
  assertion: string | undefined,
  key: string,
  now: number = Date.now(),
): UserPrincipal {
  if (!assertion || assertion.length > 16_384)
    throw new InvalidAccessTokenError();
  const parts = assertion.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1')
    throw new InvalidAccessTokenError();
  const [, encoded, suppliedSignature] = parts;
  if (
    !/^[A-Za-z0-9_-]+$/.test(encoded) ||
    !/^[A-Za-z0-9_-]+$/.test(suppliedSignature)
  ) {
    throw new InvalidAccessTokenError();
  }
  const expected = signature(encoded, key);
  const supplied = Buffer.from(suppliedSignature, 'base64url');
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    throw new InvalidAccessTokenError();
  }
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    if (
      !payload ||
      typeof payload !== 'object' ||
      payload.tokenHash !== tokenHash(accessToken) ||
      !Number.isSafeInteger(payload.expiresAt) ||
      (payload.expiresAt as number) <= Math.floor(now / 1_000) ||
      (payload.expiresAt as number) >
        Math.floor(now / 1_000) + ASSERTION_LIFETIME_SECONDS
    ) {
      throw new InvalidAccessTokenError();
    }
    return restorePrincipal(payload.principal);
  } catch {
    throw new InvalidAccessTokenError();
  }
}
