import type {
  IdentityVerificationMethod,
  IdentityVerificationPolicy,
  IdentityVerificationProvider,
} from '../model/vote-operations.types';

export const DEFAULT_IDENTITY_VERIFICATION_PROVIDER: IdentityVerificationProvider =
  'PASS';
export const DEFAULT_IDENTITY_VERIFICATION_METHOD: IdentityVerificationMethod =
  'MOBILE';

export function readIdentityVerificationPolicy(
  data: FormData,
): IdentityVerificationPolicy {
  if (data.get('identityRequired') !== 'on') return { required: false };

  return {
    required: true,
    provider:
      (String(data.get('identityProvider') ?? '').trim() as IdentityVerificationProvider) ||
      DEFAULT_IDENTITY_VERIFICATION_PROVIDER,
    method:
      (String(data.get('identityMethod') ?? '').trim() as IdentityVerificationMethod) ||
      DEFAULT_IDENTITY_VERIFICATION_METHOD,
  };
}
