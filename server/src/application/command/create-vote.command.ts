import type { IdentityVerificationPolicyProps } from '../../domain/vote/vo/identity-verification-policy.vo';
import type { VotingChannel } from '../../domain/vote/type/voting-channel.type';
import type { VotePolicyProps } from '../../domain/vote/vo/vote-policy.vo';

export class CreateVoteCommand {
  private constructor(
    readonly commissionId: string,
    readonly title: string,
    readonly votingChannels: readonly VotingChannel[],
    readonly defaultPolicy: VotePolicyProps,
    readonly identityVerificationPolicy: IdentityVerificationPolicyProps,
  ) {}

  static of(params: {
    commissionId: string;
    title: string;
    votingChannels: readonly VotingChannel[];
    defaultPolicy: VotePolicyProps;
    identityVerificationPolicy: IdentityVerificationPolicyProps;
  }): CreateVoteCommand {
    return new CreateVoteCommand(
      params.commissionId,
      params.title,
      params.votingChannels,
      params.defaultPolicy,
      params.identityVerificationPolicy,
    );
  }
}
