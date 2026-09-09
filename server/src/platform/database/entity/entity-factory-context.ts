import type { AnyEntity, EntityClass } from '@mikro-orm/core';

export interface DatabaseEntityClasses {
  readonly ElectionCommissionEntity: EntityClass<AnyEntity>;
  readonly ElectoralRollEntity: EntityClass<AnyEntity>;
  readonly ElectoralRollAccessGrantEntity: EntityClass<AnyEntity>;
  readonly ElectoralRollMemberEntity: EntityClass<AnyEntity>;
  readonly ElectoralRollSnapshotEntity: EntityClass<AnyEntity>;
  readonly ElectoralRollSnapshotMemberEntity: EntityClass<AnyEntity>;
  readonly VoteEntity: EntityClass<AnyEntity>;
  readonly ElectionCommissionMemberEntity: EntityClass<AnyEntity>;
  readonly VoteVotingChannelEntity: EntityClass<AnyEntity>;
  readonly VoteDetailEntity: EntityClass<AnyEntity>;
  readonly ElectorEntity: EntityClass<AnyEntity>;
  readonly CandidateEntity: EntityClass<AnyEntity>;
  readonly FieldVotingSessionEntity: EntityClass<AnyEntity>;
  readonly VoteParticipationEntity: EntityClass<AnyEntity>;
  readonly VoteResultEntity: EntityClass<AnyEntity>;
  readonly FileEntity: EntityClass<AnyEntity>;
  readonly FieldVotingSessionManagerEntity: EntityClass<AnyEntity>;
  readonly FieldParticipationEvidenceEntity: EntityClass<AnyEntity>;
  readonly VoteAttachmentEntity: EntityClass<AnyEntity>;
  readonly VoteDetailAttachmentEntity: EntityClass<AnyEntity>;
  readonly ElectorAttachmentEntity: EntityClass<AnyEntity>;
  readonly CandidateAttachmentEntity: EntityClass<AnyEntity>;
  readonly ElectorIdentityVerificationEntity: EntityClass<AnyEntity>;
  readonly VoteContentChangeHistoryEntity: EntityClass<AnyEntity>;
  readonly VoteResultStorageRecordEntity: EntityClass<AnyEntity>;
  readonly SmsDispatchEntity: EntityClass<AnyEntity>;
  readonly SmsDeliveryEntity: EntityClass<AnyEntity>;
  readonly BillingOrderEntity: EntityClass<AnyEntity>;
  readonly IntegrationOutboxEntity: EntityClass<AnyEntity>;
  readonly ParticipationInvitationEntity: EntityClass<AnyEntity>;
  readonly ElectorParticipantSessionEntity: EntityClass<AnyEntity>;
  readonly ParticipationInvitationDeliveryEntity: EntityClass<AnyEntity>;
  readonly OrganizationApplicationEntity: EntityClass<AnyEntity>;
  readonly OrganizationInvitationEntity: EntityClass<AnyEntity>;
  readonly UserProfileEntity: EntityClass<AnyEntity>;
}

export interface DatabaseEntityFactoryContext {
  readonly defineEntity: typeof import('@mikro-orm/postgresql').defineEntity;
  readonly p: typeof import('@mikro-orm/postgresql').p;
  readonly entities: Partial<DatabaseEntityClasses>;
}

export function getEntity<K extends keyof DatabaseEntityClasses>(
  context: DatabaseEntityFactoryContext,
  name: K,
): DatabaseEntityClasses[K] {
  const entity = context.entities[name];

  if (!entity) {
    throw new Error(`database entity is not registered: ${String(name)}`);
  }

  return entity;
}

export function registerEntities(
  context: DatabaseEntityFactoryContext,
  entities: Partial<DatabaseEntityClasses>,
): void {
  Object.assign(context.entities, entities);
}
