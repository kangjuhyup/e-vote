import { DomainError } from '../../domain-error';

export type IdentityVerificationPolicyProps = {
  readonly required: boolean;
  readonly provider?: string;
  readonly method?: string;
};

export class IdentityVerificationPolicy {
  private constructor(
    readonly required: boolean,
    readonly provider: string | undefined,
    readonly method: string | undefined,
  ) {}

  static of(
    params: IdentityVerificationPolicyProps,
  ): IdentityVerificationPolicy {
    const provider = params.provider?.trim() || undefined;
    const method = params.method?.trim() || undefined;

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
