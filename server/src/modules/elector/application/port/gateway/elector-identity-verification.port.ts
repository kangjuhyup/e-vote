import type { ElectorAggregate } from '../../../domain/elector.aggregate';
import type {
  ElectorIdentityVerificationEvidence,
  ElectorIdentityVerificationResult,
} from '../../../domain/vo/elector-identity-verification.vo';

export const ELECTOR_IDENTITY_VERIFICATION_PORT = Symbol(
  'ELECTOR_IDENTITY_VERIFICATION_PORT',
);

export type ElectorIdentityVerificationRequest = {
  readonly voteId: string;
  readonly elector: ElectorAggregate;
  readonly evidence: ElectorIdentityVerificationEvidence;
};

export interface ElectorIdentityVerificationPort {
  verify(
    request: ElectorIdentityVerificationRequest,
  ): Promise<ElectorIdentityVerificationResult>;
}
