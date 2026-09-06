import type {
  ElectorIdentityVerificationPort,
  ElectorIdentityVerificationRequest,
} from '../../application/port/gateway/elector-identity-verification.port';
import { ElectorIdentityVerificationResult } from '../../domain/vo/elector-identity-verification.vo';
import { DomainError } from '../../../../shared/domain/domain-error';

const MOCK_VERIFICATION_SUCCESS_RATE = 0.8;

export type MockElectorIdentityVerificationRandomSource = () => number;

/** Development simulator; this does not establish a real person's identity. */
export class MockElectorIdentityVerificationAdapter implements ElectorIdentityVerificationPort {
  constructor(
    private readonly random: MockElectorIdentityVerificationRandomSource = Math.random,
  ) {}

  verify(
    request: ElectorIdentityVerificationRequest,
  ): Promise<ElectorIdentityVerificationResult> {
    if (request.evidence.provider !== 'MOCK')
      throw new DomainError('mock verification requires provider MOCK');
    if (
      !/^mock-(success|failure):[a-zA-Z0-9-]{8,100}$/.test(
        request.evidence.transactionId,
      )
    ) {
      throw new DomainError(
        'use mock-success:<unique-id> or mock-failure:<unique-id>',
      );
    }

    const explicitlyFailed =
      request.evidence.transactionId.startsWith('mock-failure:');

    return Promise.resolve(
      ElectorIdentityVerificationResult.of({
        verified:
          !explicitlyFailed && this.random() < MOCK_VERIFICATION_SUCCESS_RATE,
        provider: 'ETC',
        method: 'ADMIN',
        isMock: true,
      }),
    );
  }
}
