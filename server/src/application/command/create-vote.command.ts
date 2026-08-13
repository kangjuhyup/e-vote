import type { IdentityVerificationPolicyProps } from '../../domain/vote/vo/identity-verification-policy.vo';
import type { VotePolicyProps } from '../../domain/vote/vo/vote-policy.vo';

export class CreateVoteCommand {
  private constructor(
    readonly title: string,
    readonly defaultPolicy: VotePolicyProps,
    readonly identityVerificationPolicy: IdentityVerificationPolicyProps,
  ) {}

  static of(params: {
    title: string;
    defaultPolicy: VotePolicyProps;
    identityVerificationPolicy: IdentityVerificationPolicyProps;
  }): CreateVoteCommand {
    return new CreateVoteCommand(
      params.title,
      params.defaultPolicy,
      params.identityVerificationPolicy,
    );
  }
}
