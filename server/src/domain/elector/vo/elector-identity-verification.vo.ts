import { DomainError } from '../../shared/domain-error';

export type ElectorIdentityVerificationEvidenceProps = {
  readonly provider: string;
  readonly transactionId: string;
  readonly verifiedAt: Date;
};

export class ElectorIdentityVerificationEvidence {
  private constructor(
    readonly provider: string,
    readonly transactionId: string,
    readonly verifiedAt: Date,
  ) {}

  static of(
    params: ElectorIdentityVerificationEvidenceProps,
  ): ElectorIdentityVerificationEvidence {
    const provider = params.provider.trim();
    const transactionId = params.transactionId.trim();

    if (!provider) {
      throw new DomainError('identity verification provider is required');
    }

    if (!transactionId) {
      throw new DomainError('identity verification transactionId is required');
    }

    if (Number.isNaN(params.verifiedAt.getTime())) {
      throw new DomainError('identity verification verifiedAt must be valid');
    }

    return new ElectorIdentityVerificationEvidence(
      provider,
      transactionId,
      params.verifiedAt,
    );
  }
}

export class ElectorIdentityVerificationResult {
  private constructor(readonly verified: boolean) {}

  static of(params: {
    readonly verified: boolean;
  }): ElectorIdentityVerificationResult {
    return new ElectorIdentityVerificationResult(params.verified);
  }
}
