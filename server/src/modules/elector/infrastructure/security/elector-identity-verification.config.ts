import { MockElectorIdentityVerificationAdapter } from './mock-elector-identity-verification.adapter';
import { NotConfiguredElectorIdentityVerificationAdapter } from './not-configured-elector-identity-verification.adapter';

export function isMockElectorVerificationEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  const mode = environment.VOTE_IDENTITY_VERIFICATION_MODE;
  if (mode === undefined || mode === 'disabled') return false;
  if (mode !== 'mock')
    throw new Error('unsupported VOTE_IDENTITY_VERIFICATION_MODE');
  if (!['development', 'test'].includes(environment.NODE_ENV ?? '')) {
    throw new Error(
      'Mock elector verification requires NODE_ENV=development or test',
    );
  }
  return true;
}
export function createElectorIdentityVerificationAdapter() {
  return isMockElectorVerificationEnabled()
    ? new MockElectorIdentityVerificationAdapter()
    : new NotConfiguredElectorIdentityVerificationAdapter();
}
