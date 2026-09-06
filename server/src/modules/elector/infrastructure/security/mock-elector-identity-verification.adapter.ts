import type {
  ElectorIdentityVerificationPort,
  ElectorIdentityVerificationRequest,
} from '../../application/port/gateway/elector-identity-verification.port';
import { ElectorIdentityVerificationResult } from '../../domain/vo/elector-identity-verification.vo';
import { DomainError } from '../../../../shared/domain/domain-error';

/** Development simulator; this does not establish a real person's identity. */
export class MockElectorIdentityVerificationAdapter implements ElectorIdentityVerificationPort {
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
    return Promise.resolve(
      ElectorIdentityVerificationResult.of({
        verified: request.evidence.transactionId.startsWith('mock-success:'),
        provider: 'ETC',
        method: 'ADMIN',
        isMock: true,
      }),
    );
  }
}
