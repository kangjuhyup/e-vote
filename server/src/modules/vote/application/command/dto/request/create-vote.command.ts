import type { IdentityVerificationPolicyProps } from '../../../../../../shared/domain/voting/vo/identity-verification-policy.vo';
import type { VotingChannel } from '../../../../../../shared/domain/voting/type/voting-channel.type';
import type { VotePolicyProps } from '../../../../../../shared/domain/voting/vo/vote-policy.vo';

export class CreateVoteCommand {
  private constructor(
    readonly createdByUserPrincipalId: string,
    readonly tenantId: string,
    readonly organizationGroupId: string,
    readonly organizationGroupCode: string,
    readonly commissionId: string,
    readonly title: string,
    readonly votingChannels: readonly VotingChannel[],
    readonly defaultPolicy: VotePolicyProps,
    readonly identityVerificationPolicy: IdentityVerificationPolicyProps,
    readonly startedAt: Date,
    readonly endedAt: Date,
  ) {}

  static of(params: {
    createdByUserPrincipalId: string;
    tenantId: string;
    organizationGroupId: string;
    organizationGroupCode: string;
    commissionId: string;
    title: string;
    votingChannels: readonly VotingChannel[];
    defaultPolicy: VotePolicyProps;
    identityVerificationPolicy: IdentityVerificationPolicyProps;
    startedAt: Date;
    endedAt: Date;
  }): CreateVoteCommand {
    return new CreateVoteCommand(
      params.createdByUserPrincipalId,
      params.tenantId,
      params.organizationGroupId,
      params.organizationGroupCode,
      params.commissionId,
      params.title,
      params.votingChannels,
      params.defaultPolicy,
      params.identityVerificationPolicy,
      params.startedAt,
      params.endedAt,
    );
  }
}
