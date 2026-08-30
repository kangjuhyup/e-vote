import {
  getEntity,
  type DatabaseEntityFactoryContext,
} from '../../../../../platform/database/entity/entity-factory-context';
import type {
  ElectionCommissionMemberRole,
  ElectionCommissionMemberStatus,
  ElectionCommissionStatus,
} from '../../../../../platform/database/entity/type/database-enum.type';

export function createElectionCommissionEntities(
  context: DatabaseEntityFactoryContext,
): Partial<
  import('../../../../../platform/database/entity/entity-factory-context').DatabaseEntityClasses
> {
  const { defineEntity, p } = context;

  const ElectionCommissionSchema = defineEntity({
    name: 'ElectionCommissionEntity',
    tableName: 'election_commissions',
    properties: {
      id: p.uuid().primary(),
      name: p.string(),
      status: p.string().$type<ElectionCommissionStatus>(),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      members: () =>
        p
          .oneToMany(getEntity(context, 'ElectionCommissionMemberEntity'))
          .mappedBy('commission'),
      votes: () =>
        p.oneToMany(getEntity(context, 'VoteEntity')).mappedBy('commission'),
      fieldVotingSessions: () =>
        p
          .oneToMany(getEntity(context, 'FieldVotingSessionEntity'))
          .mappedBy('commission'),
    },
  });
  class ElectionCommissionEntity extends ElectionCommissionSchema.class {}
  ElectionCommissionSchema.setClass(ElectionCommissionEntity);

  const ElectionCommissionMemberSchema = defineEntity({
    name: 'ElectionCommissionMemberEntity',
    tableName: 'election_commission_members',
    uniques: [
      {
        name: 'election_commission_members_commission_user_unique',
        properties: ['commission', 'userPrincipalId'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      commission: () =>
        p
          .manyToOne(getEntity(context, 'ElectionCommissionEntity'))
          .fieldName('commission_id')
          .inversedBy('members')
          .deleteRule('cascade'),
      userPrincipalId: p.string().fieldName('user_principal_id').nullable(),
      name: p.string(),
      role: p.string().$type<ElectionCommissionMemberRole>(),
      status: p.string().$type<ElectionCommissionMemberStatus>(),
      registeredAt: p.datetime().fieldName('registered_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      fieldVotingSessionManagerLinks: () =>
        p
          .oneToMany(getEntity(context, 'FieldVotingSessionManagerEntity'))
          .mappedBy('commissionMember'),
      verifiedFieldParticipationEvidences: () =>
        p
          .oneToMany(getEntity(context, 'FieldParticipationEvidenceEntity'))
          .mappedBy('verifiedByCommissionMember'),
    },
  });
  class ElectionCommissionMemberEntity
    extends ElectionCommissionMemberSchema.class {}
  ElectionCommissionMemberSchema.setClass(ElectionCommissionMemberEntity);

  return {
    ElectionCommissionEntity,
    ElectionCommissionMemberEntity,
  };
}
