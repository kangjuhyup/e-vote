import type { AnyEntity, EntityClass } from '@mikro-orm/core';
import { createAttachmentEntities } from '../modules/vote/infrastructure/database/entity/attachment.entities';
import { createElectionCommissionEntities } from '../modules/election-commission/infrastructure/database/entity/election-commission.entities';
import { createElectoralRollEntities } from '../modules/electoral-roll/infrastructure/database/entity/electoral-roll.entities';
import { createElectorEntities } from '../modules/elector/infrastructure/database/entity/elector.entities';
import {
  registerEntities,
  type DatabaseEntityClasses,
  type DatabaseEntityFactoryContext,
} from '../platform/database/entity/entity-factory-context';
import { createParticipationEntities } from '../modules/participation/infrastructure/database/entity/participation.entities';
import { createResultEntities } from '../modules/participation/infrastructure/database/entity/result.entities';
import { createVoteEntities } from '../modules/vote/infrastructure/database/entity/vote.entities';
import { createSmsDispatchEntities } from '../shared/infrastructure/database/entity/sms-dispatch.entities';
import { createBillingEntities } from '../modules/billing/infrastructure/database/entity/billing.entities';

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
  registerEntities(context, createElectoralRollEntities(context));
  registerEntities(context, createVoteEntities(context));
  registerEntities(context, createElectorEntities(context));
  registerEntities(context, createParticipationEntities(context));
  registerEntities(context, createAttachmentEntities(context));
  registerEntities(context, createResultEntities(context));
  registerEntities(context, createSmsDispatchEntities(context));
  registerEntities(context, createBillingEntities(context));

  const entities = context.entities as DatabaseEntityClasses;
  const databaseEntities = [
    entities.ElectionCommissionEntity,
    entities.ElectoralRollEntity,
    entities.ElectoralRollAccessGrantEntity,
    entities.ElectoralRollMemberEntity,
    entities.ElectoralRollSnapshotEntity,
    entities.ElectoralRollSnapshotMemberEntity,
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
    entities.SmsDispatchEntity,
    entities.SmsDeliveryEntity,
    entities.BillingOrderEntity,
  ];

  cachedRegistry = {
    ...entities,
    databaseEntities,
  };

  return cachedRegistry;
}
