import { VoteAggregate } from '../../../domain/vote/vote.aggregate';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../domain/vote/type/vote-policy.type';
import { VoteStatus } from '../../../domain/vote/type/vote-status.type';
import { IdentityVerificationPolicy } from '../../../domain/vote/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../domain/vote/vo/vote-policy.vo';

export type VotePersistence = {
  readonly id: string;
  readonly title: string;
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
      title: entity.title,
      defaultPolicy: VotePolicy.of({
        privacyMode: entity.defaultPrivacyMode,
        participationUnit: entity.defaultParticipationUnit,
        resultStorageMode: entity.defaultResultStorageMode,
        voteWeightMode: entity.defaultVoteWeightMode,
      }),
      identityVerificationPolicy: IdentityVerificationPolicy.of({
        required: entity.identityVerificationRequired,
        provider: entity.identityVerificationProvider,
        method: entity.identityVerificationMethod,
      }),
      status: entity.status,
    });
  }
}
