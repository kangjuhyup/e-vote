import {
  getEntity,
  type DatabaseEntityFactoryContext,
} from './entity-factory-context';
import type {
  ElectorStatus,
  IdentityVerificationMethod,
  IdentityVerificationProvider,
  IdentityVerificationStatus,
} from './type/database-enum.type';

export function createElectorEntities(
  context: DatabaseEntityFactoryContext,
): Partial<import('./entity-factory-context').DatabaseEntityClasses> {
  const { defineEntity, p } = context;

  const ElectorSchema = defineEntity({
    name: 'ElectorEntity',
    tableName: 'electors',
    uniques: [
      {
        name: 'electors_vote_id_identifier_unique',
        properties: ['vote', 'identifier'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      vote: () =>
        p
          .manyToOne(getEntity(context, 'VoteEntity'))
          .fieldName('vote_id')
          .inversedBy('electors')
          .deleteRule('cascade'),
      snapshotMember: () =>
        p
          .manyToOne(getEntity(context, 'ElectoralRollSnapshotMemberEntity'))
          .fieldName('snapshot_member_id')
          .inversedBy('electors')
          .deleteRule('restrict')
          .nullable(),
      name: p.text(),
      identifier: p.string(),
      phoneNumber: p.text().fieldName('phone_number').nullable(),
      phoneNumberHash: p.string().fieldName('phone_number_hash').nullable(),
      birthDate: p.text().fieldName('birth_date').nullable(),
      groupKey: p.string().fieldName('group_key').nullable(),
      voteWeight: p.decimal('number').fieldName('vote_weight').default(1),
      status: p.string().$type<ElectorStatus>(),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      participations: () =>
        p
          .oneToMany(getEntity(context, 'VoteParticipationEntity'))
          .mappedBy('elector'),
      attachments: () =>
        p
          .oneToMany(getEntity(context, 'ElectorAttachmentEntity'))
          .mappedBy('elector'),
      identityVerifications: () =>
        p
          .oneToMany(getEntity(context, 'ElectorIdentityVerificationEntity'))
          .mappedBy('elector'),
    },
  });
  class ElectorEntity extends ElectorSchema.class {}
  ElectorSchema.setClass(ElectorEntity);

  const ElectorIdentityVerificationSchema = defineEntity({
    name: 'ElectorIdentityVerificationEntity',
    tableName: 'elector_identity_verifications',
    properties: {
      id: p.uuid().primary(),
      elector: () =>
        p
          .manyToOne(getEntity(context, 'ElectorEntity'))
          .fieldName('elector_id')
          .inversedBy('identityVerifications')
          .deleteRule('cascade'),
      provider: p.string().$type<IdentityVerificationProvider>(),
      method: p.string().$type<IdentityVerificationMethod>(),
      status: p.string().$type<IdentityVerificationStatus>(),
      providerTransactionId: p
        .string()
        .fieldName('provider_transaction_id')
        .nullable(),
      ciHash: p.string().fieldName('ci_hash').nullable(),
      diHash: p.string().fieldName('di_hash').nullable(),
      phoneHash: p.string().fieldName('phone_hash').nullable(),
      failureReason: p.string().fieldName('failure_reason').nullable(),
      ipAddress: p.string().fieldName('ip_address').nullable(),
      userAgent: p.text().fieldName('user_agent').nullable(),
      requestedAt: p.datetime().fieldName('requested_at'),
      verifiedAt: p.datetime().fieldName('verified_at').nullable(),
      createdAt: p.datetime().fieldName('created_at'),
    },
  });
  class ElectorIdentityVerificationEntity
    extends ElectorIdentityVerificationSchema.class {}
  ElectorIdentityVerificationSchema.setClass(ElectorIdentityVerificationEntity);

  return {
    ElectorEntity,
    ElectorIdentityVerificationEntity,
  };
}
