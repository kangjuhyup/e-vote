import { HmacParticipationAccessTokenAdapter } from '../../../src/modules/participation/infrastructure/security/hmac-participation-access-token.adapter';
import { InvalidParticipationAccessTokenError } from '../../../src/modules/participation/application/port/security/participation-access-token.port';

describe('HmacParticipationAccessTokenAdapter', () => {
  const adapter = new HmacParticipationAccessTokenAdapter({
    currentKeyId: 'current',
    keys: { current: 'a-test-key-with-at-least-thirty-two-bytes' },
  });

  it('round trips only invitation reference claims and a digest', () => {
    const issued = adapter.issueReference('invitation-1', 3);

    expect(adapter.verifyReference(issued.token)).toEqual({
      invitationId: 'invitation-1',
      generation: 3,
      keyId: 'current',
      tokenDigest: issued.tokenDigest,
    });
    expect(JSON.stringify(decodePayload(issued.token))).not.toMatch(
      /vote|elector|phone|expir/i,
    );
  });

  it('rejects payload and signature tampering with a generic error', () => {
    const issued = adapter.issueReference('invitation-1', 1);
    const [payload, signature] = issued.token.split('.');
    const claims = decodePayload(issued.token);
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...claims, generation: 2 }),
    ).toString('base64url');

    expect(() =>
      adapter.verifyReference(`${tamperedPayload}.${signature}`),
    ).toThrow(InvalidParticipationAccessTokenError);
    expect(() =>
      adapter.verifyReference(`${payload}.${signature.slice(0, -1)}A`),
    ).toThrow(InvalidParticipationAccessTokenError);
  });

  it('rejects an unknown key id without leaking it in the error', () => {
    const issued = adapter.issueReference('invitation-1', 1);
    const [, signature] = issued.token.split('.');
    const claims = decodePayload(issued.token);
    const payload = Buffer.from(
      JSON.stringify({ ...claims, keyId: 'removed-key' }),
    ).toString('base64url');

    let error: unknown;
    try {
      adapter.verifyReference(`${payload}.${signature}`);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidParticipationAccessTokenError);
    expect((error as Error).message).not.toContain('removed-key');
  });

  it('issues opaque session and csrf values while storing only digests', () => {
    const first = adapter.issueSessionCredentials();
    const second = adapter.issueSessionCredentials();

    expect(first.sessionToken).not.toBe(second.sessionToken);
    expect(first.csrfToken).not.toBe(second.csrfToken);
    expect(first.sessionTokenDigest).toBe(adapter.digest(first.sessionToken));
    expect(first.csrfTokenDigest).toBe(adapter.digest(first.csrfToken));
    expect(first.sessionTokenDigest).toHaveLength(64);
    expect(adapter.deriveCsrfToken(first.sessionToken)).toBe(first.csrfToken);
  });
});

function decodePayload(token: string): Record<string, unknown> {
  const [payload] = token.split('.');
  return JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as Record<string, unknown>;
}
