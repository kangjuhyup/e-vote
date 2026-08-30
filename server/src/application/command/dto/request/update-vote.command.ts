import type { IdentityVerificationPolicyProps } from '../../../../domain/vote/vo/identity-verification-policy.vo';
import type { VotingChannel } from '../../../../domain/vote/type/voting-channel.type';
import type { VotePolicyProps } from '../../../../domain/vote/vo/vote-policy.vo';

export class UpdateVoteCommand {
  private constructor(
    readonly voteId: string,
    readonly title: string,
    readonly votingChannels: readonly VotingChannel[],
    readonly defaultPolicy: VotePolicyProps,
    readonly identityVerificationPolicy: IdentityVerificationPolicyProps,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly title: string;
    readonly votingChannels: readonly VotingChannel[];
    readonly defaultPolicy: VotePolicyProps;
    readonly identityVerificationPolicy: IdentityVerificationPolicyProps;
  }): UpdateVoteCommand {
    return new UpdateVoteCommand(
      params.voteId,
      params.title,
      params.votingChannels,
      params.defaultPolicy,
      params.identityVerificationPolicy,
    );
  }
}
