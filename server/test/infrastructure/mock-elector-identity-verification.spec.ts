import { isMockElectorVerificationEnabled } from '../../src/modules/elector/infrastructure/security/elector-identity-verification.config';
import { MockElectorIdentityVerificationAdapter } from '../../src/modules/elector/infrastructure/security/mock-elector-identity-verification.adapter';
import { ElectorAggregate } from '../../src/modules/elector/domain/elector.aggregate';
import { ElectorIdentityVerificationEvidence } from '../../src/modules/elector/domain/vo/elector-identity-verification.vo';

describe('mock elector verification', () => {
  it('defaults to disabled', () =>
    expect(isMockElectorVerificationEnabled({})).toBe(false));
  it.each(['production', 'staging', undefined])(
    'rejects mock in %s',
    (NODE_ENV) => {
      expect(() =>
        isMockElectorVerificationEnabled({
          NODE_ENV,
          VOTE_IDENTITY_VERIFICATION_MODE: 'mock',
        }),
      ).toThrow();
    },
  );
  it.each(['development', 'test'])('allows explicit mock in %s', (NODE_ENV) => {
    expect(
      isMockElectorVerificationEnabled({
        NODE_ENV,
        VOTE_IDENTITY_VERIFICATION_MODE: 'mock',
      }),
    ).toBe(true);
  });
  it.each([
    ['mock-success:12345678', true],
    ['mock-failure:12345678', false],
  ] as const)('simulates %s', async (transactionId, verified) => {
    const result = await new MockElectorIdentityVerificationAdapter().verify({
      voteId: 'vote-1',
      userPrincipalId: 'user-1',
      elector: ElectorAggregate.create({
        id: 'elector-1',
        voteId: 'vote-1',
        identifier: 'member-1',
      }),
      evidence: ElectorIdentityVerificationEvidence.of({
        provider: 'MOCK',
        transactionId,
        verifiedAt: new Date(),
      }),
    });
    expect(result).toMatchObject({ verified, isMock: true, provider: 'ETC' });
  });
  it('does not pretend to verify a real provider', () => {
    expect(() =>
      new MockElectorIdentityVerificationAdapter().verify({
        voteId: 'vote-1',
        userPrincipalId: 'user-1',
        elector: ElectorAggregate.create({
          id: 'elector-1',
          voteId: 'vote-1',
          identifier: 'member-1',
        }),
        evidence: ElectorIdentityVerificationEvidence.of({
          provider: 'PASS',
          transactionId: 'mock-success:12345678',
          verifiedAt: new Date(),
        }),
      }),
    ).toThrow('provider MOCK');
  });
});
