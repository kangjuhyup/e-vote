import { VoteAggregate } from '../../../domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../domain/vote/type/vote-status.type';
import { VotingChannel } from '../../../domain/vote/type/voting-channel.type';
import { IdentityVerificationPolicy } from '../../../domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../domain/vote/vo/vote-policy.vo';
import { EntityRelationReference } from './mapper-relation.type';

export type VotePersistence = {
  readonly id: string;
  readonly commission: EntityRelationReference;
  readonly electoralRollSnapshot: EntityRelationReference | null;
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
      commissionId: entity.commission.id,
      electoralRollSnapshotId: entity.electoralRollSnapshot?.id,
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
