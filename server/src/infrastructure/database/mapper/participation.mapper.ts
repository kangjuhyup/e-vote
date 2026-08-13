import { ParticipationAggregate } from '../../../domain/participation/participation.aggregate';
import { ParticipationStatus } from '../../../domain/participation/type/participation-status.type';
import { EntityRelationReference } from './mapper-relation.type';

export type ParticipationPersistence = {
  readonly id: string;
  readonly voteDetail: EntityRelationReference;
  readonly elector: EntityRelationReference;
  readonly candidate: EntityRelationReference | null;
  readonly groupKey: string | null;
  readonly voteWeight: number | string;
  readonly participatedAt: Date;
  readonly status: ParticipationStatus;
};

export class ParticipationMapper {
  static toDomain(entity: ParticipationPersistence): ParticipationAggregate {
    return ParticipationAggregate.reconstitute({
      id: entity.id,
      voteDetailId: entity.voteDetail.id,
      electorId: entity.elector.id,
      candidateId: entity.candidate?.id,
      groupKey: entity.groupKey ?? undefined,
      voteWeight: Number(entity.voteWeight),
      participatedAt: entity.participatedAt,
      status: entity.status,
    });
  }
}
