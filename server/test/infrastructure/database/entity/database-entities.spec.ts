import { createDatabaseConfig } from '../../../../src/platform/database/database.config';
import { createDatabaseEntityRegistry } from '../../../../src/composition/persistence/database-entity.registry';

describe('database entities registry', () => {
  it('registers all ERD entity classes', async () => {
    const { databaseEntities } = await createDatabaseEntityRegistry();

    expect(databaseEntities.map((entity) => entity.name).sort()).toEqual([
      'BillingOrderEntity',
      'CandidateAttachmentEntity',
      'CandidateEntity',
      'ElectionCommissionEntity',
      'ElectionCommissionMemberEntity',
      'ElectorAttachmentEntity',
      'ElectorEntity',
      'ElectorIdentityVerificationEntity',
      'ElectorParticipantSessionEntity',
      'ElectoralRollAccessGrantEntity',
      'ElectoralRollEntity',
      'ElectoralRollMemberEntity',
      'ElectoralRollSnapshotEntity',
      'ElectoralRollSnapshotMemberEntity',
      'FieldParticipationEvidenceEntity',
      'FieldVotingSessionEntity',
      'FieldVotingSessionManagerEntity',
      'FileEntity',
      'IntegrationOutboxEntity',
      'OrganizationApplicationEntity',
      'OrganizationInvitationEntity',
      'ParticipationInvitationDeliveryEntity',
      'ParticipationInvitationEntity',
      'SmsDeliveryEntity',
      'SmsDispatchEntity',
      'UserProfileEntity',
      'VoteAttachmentEntity',
      'VoteContentChangeHistoryEntity',
      'VoteDetailAttachmentEntity',
      'VoteDetailEntity',
      'VoteEntity',
      'VoteParticipationEntity',
      'VoteResultEntity',
      'VoteResultStorageRecordEntity',
      'VoteVotingChannelEntity',
    ]);
  });

  it('uses the entity registry in database config', async () => {
    const [{ databaseEntities }, config] = await Promise.all([
      createDatabaseEntityRegistry(),
      createDatabaseConfig({}, createDatabaseEntityRegistry),
    ]);

    expect(config.entities).toBe(databaseEntities);
    expect(config.entitiesTs).toBe(databaseEntities);
  });
});
