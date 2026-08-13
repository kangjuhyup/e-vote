import { ElectorAggregate } from '../../../domain/elector/elector.aggregate';
import { ElectorStatus } from '../../../domain/elector/type/elector-status.type';
import { EntityRelationReference } from './mapper-relation.type';

export type ElectorPersistence = {
  readonly id: string;
  readonly vote: EntityRelationReference;
  readonly identifier: string;
  readonly groupKey: string | null;
  readonly voteWeight: number | string;
  readonly status: ElectorStatus;
};

export type ElectorMapperOptions = {
  readonly identityVerified?: boolean;
};

export class ElectorMapper {
  static toDomain(
    entity: ElectorPersistence,
    options: ElectorMapperOptions = {},
  ): ElectorAggregate {
    return ElectorAggregate.reconstitute({
      id: entity.id,
      voteId: entity.vote.id,
      identifier: entity.identifier,
      groupKey: entity.groupKey ?? undefined,
      voteWeight: Number(entity.voteWeight),
      status: entity.status,
      identityVerified: options.identityVerified ?? false,
    });
  }
}
