import {
  getEntity,
  type DatabaseEntityFactoryContext,
} from './entity-factory-context';

export function createElectoralRollEntities(
  context: DatabaseEntityFactoryContext,
): Partial<import('./entity-factory-context').DatabaseEntityClasses> {
  const { defineEntity, p } = context;

  const ElectoralRollSchema = defineEntity({
    name: 'ElectoralRollEntity',
    tableName: 'electoral_rolls',
    properties: {
      id: p.uuid().primary(),
      commission: () =>
        p
          .manyToOne(getEntity(context, 'ElectionCommissionEntity'))
          .fieldName('commission_id')
          .deleteRule('restrict'),
      name: p.string(),
      revision: p.integer().default(1),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      members: () =>
        p
          .oneToMany(getEntity(context, 'ElectoralRollMemberEntity'))
          .mappedBy('electoralRoll'),
      snapshots: () =>
        p
          .oneToMany(getEntity(context, 'ElectoralRollSnapshotEntity'))
          .mappedBy('sourceRoll'),
    },
  });
  class ElectoralRollEntity extends ElectoralRollSchema.class {}
  ElectoralRollSchema.setClass(ElectoralRollEntity);

  const ElectoralRollMemberSchema = defineEntity({
    name: 'ElectoralRollMemberEntity',
    tableName: 'electoral_roll_members',
    uniques: [
      {
        name: 'electoral_roll_members_roll_id_identifier_unique',
        properties: ['electoralRoll', 'identifier'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      electoralRoll: () =>
        p
          .manyToOne(getEntity(context, 'ElectoralRollEntity'))
          .fieldName('electoral_roll_id')
          .inversedBy('members')
          .deleteRule('cascade'),
      identifier: p.string(),
      groupKey: p.string().fieldName('group_key').nullable(),
      voteWeight: p.decimal('number').fieldName('vote_weight').default(1),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
    },
  });
  class ElectoralRollMemberEntity extends ElectoralRollMemberSchema.class {}
  ElectoralRollMemberSchema.setClass(ElectoralRollMemberEntity);

  const ElectoralRollSnapshotSchema = defineEntity({
    name: 'ElectoralRollSnapshotEntity',
    tableName: 'electoral_roll_snapshots',
    uniques: [
      {
        name: 'electoral_roll_snapshots_roll_id_revision_unique',
        properties: ['sourceRoll', 'sourceRevision'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      sourceRoll: () =>
        p
          .manyToOne(getEntity(context, 'ElectoralRollEntity'))
          .fieldName('source_roll_id')
          .inversedBy('snapshots')
          .deleteRule('restrict'),
      commission: () =>
        p
          .manyToOne(getEntity(context, 'ElectionCommissionEntity'))
          .fieldName('commission_id')
          .deleteRule('restrict'),
      rollName: p.string().fieldName('roll_name'),
      sourceRevision: p.integer().fieldName('source_revision'),
      memberCount: p.integer().fieldName('member_count'),
      contentHash: p.string().fieldName('content_hash'),
      createdAt: p.datetime().fieldName('created_at'),
      members: () =>
        p
          .oneToMany(getEntity(context, 'ElectoralRollSnapshotMemberEntity'))
          .mappedBy('snapshot'),
      votes: () =>
        p
          .oneToMany(getEntity(context, 'VoteEntity'))
          .mappedBy('electoralRollSnapshot'),
    },
  });
  class ElectoralRollSnapshotEntity extends ElectoralRollSnapshotSchema.class {}
  ElectoralRollSnapshotSchema.setClass(ElectoralRollSnapshotEntity);

  const ElectoralRollSnapshotMemberSchema = defineEntity({
    name: 'ElectoralRollSnapshotMemberEntity',
    tableName: 'electoral_roll_snapshot_members',
    uniques: [
      {
        name: 'electoral_roll_snapshot_members_snapshot_id_identifier_unique',
        properties: ['snapshot', 'identifier'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      snapshot: () =>
        p
          .manyToOne(getEntity(context, 'ElectoralRollSnapshotEntity'))
          .fieldName('snapshot_id')
          .inversedBy('members')
          .deleteRule('cascade'),
      sourceMemberId: p.uuid().fieldName('source_member_id'),
      identifier: p.string(),
      groupKey: p.string().fieldName('group_key').nullable(),
      voteWeight: p.decimal('number').fieldName('vote_weight').default(1),
      createdAt: p.datetime().fieldName('created_at'),
      electors: () =>
        p
          .oneToMany(getEntity(context, 'ElectorEntity'))
          .mappedBy('snapshotMember'),
    },
  });
  class ElectoralRollSnapshotMemberEntity
    extends ElectoralRollSnapshotMemberSchema.class {}
  ElectoralRollSnapshotMemberSchema.setClass(ElectoralRollSnapshotMemberEntity);

  return {
    ElectoralRollEntity,
    ElectoralRollMemberEntity,
    ElectoralRollSnapshotEntity,
    ElectoralRollSnapshotMemberEntity,
  };
}
