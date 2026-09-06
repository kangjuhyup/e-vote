import {
  getEntity,
  type DatabaseEntityFactoryContext,
} from '../../../../../platform/database/entity/entity-factory-context';

export function createElectoralRollEntities(
  context: DatabaseEntityFactoryContext,
): Partial<
  import('../../../../../platform/database/entity/entity-factory-context').DatabaseEntityClasses
> {
  const { defineEntity, p } = context;

  const ElectoralRollSchema = defineEntity({
    name: 'ElectoralRollEntity',
    tableName: 'electoral_rolls',
    properties: {
      id: p.uuid().primary(),
      deletedAt: p.datetime().fieldName('deleted_at').nullable(),
      name: p.string(),
      revision: p.integer().default(1),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      memberCount: p
        .integer()
        .formula(
          (columns) =>
            `(select count(*) from electoral_roll_members member where member.electoral_roll_id = ${columns.id})`,
        ),
      members: () =>
        p
          .oneToMany(getEntity(context, 'ElectoralRollMemberEntity'))
          .mappedBy('electoralRoll'),
      accessGrants: () =>
        p
          .oneToMany(getEntity(context, 'ElectoralRollAccessGrantEntity'))
          .mappedBy('electoralRoll'),
      snapshots: () =>
        p
          .oneToMany(getEntity(context, 'ElectoralRollSnapshotEntity'))
          .mappedBy('sourceRoll'),
    },
  });
  class ElectoralRollEntity extends ElectoralRollSchema.class {}
  ElectoralRollSchema.setClass(ElectoralRollEntity);

  const ElectoralRollAccessGrantSchema = defineEntity({
    name: 'ElectoralRollAccessGrantEntity',
    tableName: 'electoral_roll_access_grants',
    uniques: [
      {
        name: 'electoral_roll_access_grants_roll_principal_unique',
        properties: ['electoralRoll', 'userPrincipalId'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      electoralRoll: () =>
        p
          .manyToOne(getEntity(context, 'ElectoralRollEntity'))
          .fieldName('electoral_roll_id')
          .inversedBy('accessGrants')
          .deleteRule('cascade'),
      userPrincipalId: p.string().fieldName('user_principal_id'),
      grantedAt: p.datetime().fieldName('granted_at'),
    },
  });
  class ElectoralRollAccessGrantEntity
    extends ElectoralRollAccessGrantSchema.class {}
  ElectoralRollAccessGrantSchema.setClass(ElectoralRollAccessGrantEntity);

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
      encryptedName: p.text().fieldName('encrypted_name').nullable(),
      encryptedPhoneNumber: p
        .text()
        .fieldName('encrypted_phone_number')
        .nullable(),
      encryptedBirthDate: p.text().fieldName('encrypted_birth_date').nullable(),
      identityNameHash: p.string().fieldName('identity_name_hash').nullable(),
      identityPhoneNumberHash: p
        .string()
        .fieldName('identity_phone_number_hash')
        .nullable(),
      identityBirthDateHash: p
        .string()
        .fieldName('identity_birth_date_hash')
        .nullable(),
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
      encryptedName: p.text().fieldName('encrypted_name').nullable(),
      encryptedPhoneNumber: p
        .text()
        .fieldName('encrypted_phone_number')
        .nullable(),
      encryptedBirthDate: p.text().fieldName('encrypted_birth_date').nullable(),
      identityNameHash: p.string().fieldName('identity_name_hash').nullable(),
      identityPhoneNumberHash: p
        .string()
        .fieldName('identity_phone_number_hash')
        .nullable(),
      identityBirthDateHash: p
        .string()
        .fieldName('identity_birth_date_hash')
        .nullable(),
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
    ElectoralRollAccessGrantEntity,
    ElectoralRollMemberEntity,
    ElectoralRollSnapshotEntity,
    ElectoralRollSnapshotMemberEntity,
  };
}
