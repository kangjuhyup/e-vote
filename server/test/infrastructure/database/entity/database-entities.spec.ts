import { createDatabaseConfig } from '../../../../src/infrastructure/database/database.config';
import { createDatabaseEntityRegistry } from '../../../../src/infrastructure/database/entity';

describe('database entities registry', () => {
  it('registers all ERD entity classes', async () => {
    const { databaseEntities } = await createDatabaseEntityRegistry();

    expect(databaseEntities.map((entity) => entity.name).sort()).toEqual([
      'CandidateAttachmentEntity',
      'CandidateEntity',
      'ElectionCommissionEntity',
      'ElectionCommissionMemberEntity',
      'ElectorAttachmentEntity',
      'ElectorEntity',
      'ElectorIdentityVerificationEntity',
      'FieldParticipationEvidenceEntity',
      'FieldVotingSessionEntity',
      'FieldVotingSessionManagerEntity',
      'FileEntity',
      'VoteAttachmentEntity',
      'VoteContentChangeHistoryEntity',
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
      createDatabaseConfig({}),
    ]);

    expect(config.entities).toBe(databaseEntities);
    expect(config.entitiesTs).toBe(databaseEntities);
  });
});
