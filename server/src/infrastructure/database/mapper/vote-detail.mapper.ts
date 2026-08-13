import { VoteDetailAggregate } from '../../../domain/vote/vote-detail.aggregate';
import { VoteDetailType } from '../../../domain/vote/type/vote-detail.type';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../domain/vote/type/vote-policy.type';
import { VoteDetailStatus } from '../../../domain/vote/type/vote-status.type';
import { VotePolicyOverrides } from '../../../domain/vote/vo/vote-policy.vo';
import { EntityRelationReference } from './mapper-relation.type';

export type VoteDetailPersistence = {
  readonly id: string;
  readonly vote: EntityRelationReference;
  readonly title: string;
  readonly type: VoteDetailType;
  readonly privacyModeOverride: PrivacyMode | null;
  readonly participationUnitOverride: ParticipationUnit | null;
  readonly resultStorageModeOverride: ResultStorageMode | null;
  readonly voteWeightModeOverride: VoteWeightMode | null;
  readonly sortOrder: number;
  readonly status: VoteDetailStatus;
};

export class VoteDetailMapper {
  static toDomain(entity: VoteDetailPersistence): VoteDetailAggregate {
    return VoteDetailAggregate.reconstitute({
      id: entity.id,
      voteId: entity.vote.id,
      title: entity.title,
      type: entity.type,
      overrides: this.toPolicyOverrides(entity),
      sortOrder: entity.sortOrder,
      status: entity.status,
    });
  }

  private static toPolicyOverrides(
    entity: VoteDetailPersistence,
  ): VotePolicyOverrides {
    return {
      ...(entity.privacyModeOverride
        ? { privacyMode: entity.privacyModeOverride }
        : {}),
      ...(entity.participationUnitOverride
        ? { participationUnit: entity.participationUnitOverride }
        : {}),
      ...(entity.resultStorageModeOverride
        ? { resultStorageMode: entity.resultStorageModeOverride }
        : {}),
      ...(entity.voteWeightModeOverride
        ? { voteWeightMode: entity.voteWeightModeOverride }
        : {}),
    };
  }
}
