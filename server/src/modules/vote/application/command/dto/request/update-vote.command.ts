import type { IdentityVerificationPolicyProps } from '../../../../../../shared/domain/voting/vo/identity-verification-policy.vo';
import type { VotingChannel } from '../../../../../../shared/domain/voting/type/voting-channel.type';
import type { VotePolicyProps } from '../../../../../../shared/domain/voting/vo/vote-policy.vo';

export class UpdateVoteCommand {
  private constructor(
    readonly voteId: string,
    readonly title: string,
    readonly votingChannels: readonly VotingChannel[],
    readonly defaultPolicy: VotePolicyProps,
    readonly identityVerificationPolicy: IdentityVerificationPolicyProps,
    readonly startedAt?: Date,
    readonly endedAt?: Date,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly title: string;
    readonly votingChannels: readonly VotingChannel[];
    readonly defaultPolicy: VotePolicyProps;
    readonly identityVerificationPolicy: IdentityVerificationPolicyProps;
    readonly startedAt?: Date;
    readonly endedAt?: Date;
  }): UpdateVoteCommand {
    return new UpdateVoteCommand(
      params.voteId,
      params.title,
      params.votingChannels,
      params.defaultPolicy,
      params.identityVerificationPolicy,
      params.startedAt,
      params.endedAt,
    );
  }
}
