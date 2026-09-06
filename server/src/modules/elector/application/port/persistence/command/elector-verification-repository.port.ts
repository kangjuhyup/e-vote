import type { ElectorAggregate } from '../../../../domain/elector.aggregate';
import type { ElectorIdentityVerificationResult } from '../../../../domain/vo/elector-identity-verification.vo';

export const ELECTOR_VERIFICATION_REPOSITORY_PORT = Symbol(
  'ELECTOR_VERIFICATION_REPOSITORY_PORT',
);
export interface RecordElectorVerification {
  readonly elector: ElectorAggregate;
  readonly userPrincipalId: string;
  readonly transactionId: string;
  readonly result: ElectorIdentityVerificationResult;
}
export interface ElectorVerificationRepositoryPort {
  record(params: RecordElectorVerification): Promise<boolean>;
}
