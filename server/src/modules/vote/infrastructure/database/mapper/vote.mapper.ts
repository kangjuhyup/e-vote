import { VoteAggregate } from '../../../domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../../shared/domain/voting/type/vote-policy.type';
import { VoteStatus } from '../../../../../shared/domain/voting/type/vote-status.type';
import { VotingChannel } from '../../../../../shared/domain/voting/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../../../shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../../shared/domain/voting/vo/vote-policy.vo';
import { EntityRelationReference } from '../../../../../platform/database/mapper/mapper-relation.type';

export type VotePersistence = {
  readonly id: string;
  readonly createdByUserPrincipalId: string | null;
  readonly commission: EntityRelationReference;
  readonly electoralRollSnapshot: EntityRelationReference | null;
  readonly billingOrderId: string | null;
  readonly finalizedAt: Date | null;
  readonly startedAt: Date;
  readonly endedAt: Date;
  readonly title: string;
  readonly votingChannels: readonly {
    readonly channel: VotingChannel;
  }[];
  readonly defaultPrivacyMode: PrivacyMode;
  readonly defaultParticipationUnit: ParticipationUnit;
  readonly defaultResultStorageMode: ResultStorageMode;
  readonly defaultVoteWeightMode: VoteWeightMode;
  readonly identityVerificationRequired: boolean;
  readonly identityVerificationProvider: string | null;
  readonly identityVerificationMethod: string | null;
  readonly status: VoteStatus;
};

export class VoteMapper {
  static toDomain(entity: VotePersistence): VoteAggregate {
    return VoteAggregate.reconstitute({
      id: entity.id,
      createdByUserPrincipalId: entity.createdByUserPrincipalId ?? undefined,
      commissionId: entity.commission.id,
      electoralRollSnapshotId: entity.electoralRollSnapshot?.id,
      billingOrderId: entity.billingOrderId ?? undefined,
      finalizedAt: entity.finalizedAt ?? undefined,
      startedAt: entity.startedAt,
      endedAt: entity.endedAt,
      title: entity.title,
      votingChannels: entity.votingChannels.map(
        (votingChannel) => votingChannel.channel,
      ),
      defaultPolicy: VotePolicy.of({
        privacyMode: entity.defaultPrivacyMode,
        participationUnit: entity.defaultParticipationUnit,
        resultStorageMode: entity.defaultResultStorageMode,
        voteWeightMode: entity.defaultVoteWeightMode,
      }),
      identityVerificationPolicy: IdentityVerificationPolicy.of({
        required: entity.identityVerificationRequired,
        provider: entity.identityVerificationProvider ?? undefined,
        method: entity.identityVerificationMethod ?? undefined,
      }),
      status: entity.status,
    });
  }
}
