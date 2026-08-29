import type { AnyEntity, EntityClass } from '@mikro-orm/core';
import { createAttachmentEntities } from './attachment.entities';
import { createElectionCommissionEntities } from './election-commission.entities';
import { createElectorEntities } from './elector.entities';
import {
  registerEntities,
  type DatabaseEntityClasses,
  type DatabaseEntityFactoryContext,
} from './entity-factory-context';
import { createParticipationEntities } from './participation.entities';
import { createResultEntities } from './result.entities';
import { createVoteEntities } from './vote.entities';

export interface DatabaseEntityRegistry extends DatabaseEntityClasses {
  readonly databaseEntities: EntityClass<AnyEntity>[];
}

let cachedRegistry: DatabaseEntityRegistry | null = null;

export async function createDatabaseEntityRegistry(): Promise<DatabaseEntityRegistry> {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  const { defineEntity, p } = await import('@mikro-orm/postgresql');
  const context: DatabaseEntityFactoryContext = {
    defineEntity,
    p,
    entities: {},
  };

  registerEntities(context, createElectionCommissionEntities(context));
  registerEntities(context, createVoteEntities(context));
  registerEntities(context, createElectorEntities(context));
  registerEntities(context, createParticipationEntities(context));
  registerEntities(context, createAttachmentEntities(context));
  registerEntities(context, createResultEntities(context));

  const entities = context.entities as DatabaseEntityClasses;
  const databaseEntities = [
    entities.ElectionCommissionEntity,
    entities.VoteEntity,
    entities.ElectionCommissionMemberEntity,
    entities.VoteVotingChannelEntity,
    entities.VoteDetailEntity,
    entities.ElectorEntity,
    entities.CandidateEntity,
    entities.FieldVotingSessionEntity,
    entities.VoteParticipationEntity,
    entities.VoteResultEntity,
    entities.FileEntity,
    entities.FieldVotingSessionManagerEntity,
    entities.FieldParticipationEvidenceEntity,
    entities.VoteAttachmentEntity,
    entities.VoteDetailAttachmentEntity,
    entities.ElectorAttachmentEntity,
    entities.CandidateAttachmentEntity,
    entities.ElectorIdentityVerificationEntity,
    entities.VoteContentChangeHistoryEntity,
    entities.VoteResultStorageRecordEntity,
  ];

  cachedRegistry = {
    ...entities,
    databaseEntities,
  };

  return cachedRegistry;
}
