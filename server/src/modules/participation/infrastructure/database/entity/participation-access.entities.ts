import {
  getEntity,
  type DatabaseEntityFactoryContext,
} from '../../../../../platform/database/entity/entity-factory-context';
import type {
  ParticipantSessionScope,
  ParticipationInvitationDeliveryStatus,
} from '../../../../../platform/database/entity/type/database-enum.type';

export function createParticipationAccessEntities(
  context: DatabaseEntityFactoryContext,
): Partial<
  import('../../../../../platform/database/entity/entity-factory-context').DatabaseEntityClasses
> {
  const { defineEntity, p } = context;

  const ParticipationInvitationSchema = defineEntity({
    name: 'ParticipationInvitationEntity',
    tableName: 'participation_invitations',
    uniques: [
      {
        name: 'participation_invitations_token_digest_unique',
        properties: ['tokenDigest'],
      },
      {
        name: 'participation_invitations_vote_id_elector_id_unique',
        properties: ['vote', 'elector'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      vote: () =>
        p
          .manyToOne(getEntity(context, 'VoteEntity'))
          .fieldName('vote_id')
          .deleteRule('cascade'),
      elector: () =>
        p
          .manyToOne(getEntity(context, 'ElectorEntity'))
          .fieldName('elector_id')
          .deleteRule('cascade'),
      tokenDigest: p.string().fieldName('token_digest'),
      expiresAt: p.datetime().fieldName('expires_at').nullable(),
      generation: p.integer(),
      claimedAt: p.datetime().fieldName('claimed_at').nullable(),
      claimedSessionId: p.uuid().fieldName('claimed_session_id').nullable(),
      revokedAt: p.datetime().fieldName('revoked_at').nullable(),
      issuedByUserPrincipalId: p
        .string()
        .fieldName('issued_by_user_principal_id')
        .nullable(),
      signingKeyId: p.string().fieldName('signing_key_id').nullable(),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
    },
  });
  class ParticipationInvitationEntity
    extends ParticipationInvitationSchema.class {}
  ParticipationInvitationSchema.setClass(ParticipationInvitationEntity);

  const ElectorParticipantSessionSchema = defineEntity({
    name: 'ElectorParticipantSessionEntity',
    tableName: 'elector_participant_sessions',
    properties: {
      id: p.uuid().primary(),
      tokenDigest: p.string().length(64).fieldName('token_digest').unique(),
      csrfTokenDigest: p.string().length(64).fieldName('csrf_token_digest'),
      invitation: () =>
        p
          .manyToOne(getEntity(context, 'ParticipationInvitationEntity'))
          .fieldName('invitation_id')
          .deleteRule('cascade'),
      vote: () =>
        p
          .manyToOne(getEntity(context, 'VoteEntity'))
          .fieldName('vote_id')
          .deleteRule('cascade'),
      elector: () =>
        p
          .manyToOne(getEntity(context, 'ElectorEntity'))
          .fieldName('elector_id')
          .deleteRule('cascade'),
      invitationGeneration: p.integer().fieldName('invitation_generation'),
      scope: p.string().$type<ParticipantSessionScope>(),
      expiresAt: p.datetime().fieldName('expires_at'),
      revokedAt: p.datetime().fieldName('revoked_at').nullable(),
      createdAt: p.datetime().fieldName('created_at'),
      lastUsedAt: p.datetime().fieldName('last_used_at'),
    },
  });
  class ElectorParticipantSessionEntity
    extends ElectorParticipantSessionSchema.class {}
  ElectorParticipantSessionSchema.setClass(ElectorParticipantSessionEntity);

  const ParticipationInvitationDeliverySchema = defineEntity({
    name: 'ParticipationInvitationDeliveryEntity',
    tableName: 'participation_invitation_deliveries',
    uniques: [
      {
        name: 'participation_invitation_deliveries_invitation_generation_unique',
        properties: ['invitation', 'invitationGeneration'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      invitation: () =>
        p
          .manyToOne(getEntity(context, 'ParticipationInvitationEntity'))
          .fieldName('invitation_id')
          .deleteRule('cascade'),
      invitationGeneration: p.integer().fieldName('invitation_generation'),
      status: p.string().$type<ParticipationInvitationDeliveryStatus>(),
      availableAt: p.datetime().fieldName('available_at'),
      attemptCount: p.integer().fieldName('attempt_count'),
      lockedBy: p.string().fieldName('locked_by').nullable(),
      lockToken: p.uuid().fieldName('lock_token').nullable(),
      lockedUntil: p.datetime().fieldName('locked_until').nullable(),
      deliveredAt: p.datetime().fieldName('delivered_at').nullable(),
      lastError: p.text().fieldName('last_error').nullable(),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
    },
  });
  class ParticipationInvitationDeliveryEntity
    extends ParticipationInvitationDeliverySchema.class {}
  ParticipationInvitationDeliverySchema.setClass(
    ParticipationInvitationDeliveryEntity,
  );

  return {
    ParticipationInvitationEntity,
    ElectorParticipantSessionEntity,
    ParticipationInvitationDeliveryEntity,
  };
}
