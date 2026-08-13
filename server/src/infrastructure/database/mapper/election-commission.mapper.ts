import { ElectionCommissionAggregate } from '../../../domain/election-commission/election-commission.aggregate';
import { ElectionCommissionStatus } from '../../../domain/election-commission/type/election-commission-status.type';

export type ElectionCommissionPersistence = {
  readonly id: string;
  readonly name: string;
  readonly status: ElectionCommissionStatus;
  readonly createdAt: Date;
};

export class ElectionCommissionMapper {
  static toDomain(
    entity: ElectionCommissionPersistence,
  ): ElectionCommissionAggregate {
    return ElectionCommissionAggregate.reconstitute({
      id: entity.id,
      name: entity.name,
      status: entity.status,
      createdAt: entity.createdAt,
    });
  }
}
