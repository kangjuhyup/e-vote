import { ElectionCommissionMemberAggregate } from '../../../domain/election-commission-member.aggregate';
import { ElectionCommissionMemberRole } from '../../../domain/type/election-commission-member-role.type';
import { ElectionCommissionMemberStatus } from '../../../domain/type/election-commission-member-status.type';
import { EntityRelationReference } from '../../../../../platform/database/mapper/mapper-relation.type';

export type ElectionCommissionMemberPersistence = {
  readonly id: string;
  readonly commission: EntityRelationReference;
  readonly name: string;
  readonly role: ElectionCommissionMemberRole;
  readonly status: ElectionCommissionMemberStatus;
  readonly registeredAt: Date;
};

export class ElectionCommissionMemberMapper {
  static toDomain(
    entity: ElectionCommissionMemberPersistence,
  ): ElectionCommissionMemberAggregate {
    return ElectionCommissionMemberAggregate.reconstitute({
      id: entity.id,
      commissionId: entity.commission.id,
      name: entity.name,
      role: entity.role,
      status: entity.status,
      registeredAt: entity.registeredAt,
    });
  }
}
