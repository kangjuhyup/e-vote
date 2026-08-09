import { DomainError } from '../../shared/domain-error';

export type IdentityVerificationPolicyProps = {
  readonly required: boolean;
  readonly provider?: string | null;
  readonly method?: string | null;
};

export class IdentityVerificationPolicy {
  private constructor(
    readonly required: boolean,
    readonly provider: string | null,
    readonly method: string | null,
  ) {}

  static of(params: IdentityVerificationPolicyProps): IdentityVerificationPolicy {
    const provider = params.provider?.trim() || null;
    const method = params.method?.trim() || null;

    if (params.required && (!provider || !method)) {
      throw new DomainError(
        'identity verification provider and method are required',
      );
    }

    if (!params.required && (provider || method)) {
      throw new DomainError(
        'identity verification provider and method must be absent',
      );
    }

    return new IdentityVerificationPolicy(params.required, provider, method);
  }
}
