import { ElectorIdentityVerificationUnavailableError } from '../../application/port/gateway/elector-identity-verification.port';
import { Injectable } from '@nestjs/common';
import type { ElectorIdentityVerificationPort } from '../../application/port/gateway/elector-identity-verification.port';
import type { ElectorIdentityVerificationResult } from '../../domain/vo/elector-identity-verification.vo';

@Injectable()
export class NotConfiguredElectorIdentityVerificationAdapter implements ElectorIdentityVerificationPort {
  verify(): Promise<ElectorIdentityVerificationResult> {
    throw new ElectorIdentityVerificationUnavailableError();
  }
}
