import { VoteDetailAggregate } from '../../../domain/vote/vote-detail.aggregate';
import { VoteDetailType } from '../../../../../shared/domain/voting/type/vote-detail.type';
import {
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteWeightMode,
} from '../../../../../shared/domain/voting/type/vote-policy.type';
import { VoteDetailStatus } from '../../../../../shared/domain/voting/type/vote-status.type';
import { VotePolicyOverrides } from '../../../../../shared/domain/voting/vo/vote-policy.vo';
import { EntityRelationReference } from '../../../../../platform/database/mapper/mapper-relation.type';

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
  static toDomain(
    this: void,
    entity: VoteDetailPersistence,
  ): VoteDetailAggregate {
    return VoteDetailAggregate.reconstitute({
      id: entity.id,
      voteId: entity.vote.id,
      title: entity.title,
      type: entity.type,
      overrides: VoteDetailMapper.toPolicyOverrides(entity),
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
