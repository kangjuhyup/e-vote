import {
  getEntity,
  type DatabaseEntityFactoryContext,
} from './entity-factory-context';
import type {
  ContentChangeAction,
  ContentChangeActorType,
  ContentChangeTargetType,
  ResultStorageMode,
  ResultStorageStatus,
} from './type/database-enum.type';

export function createResultEntities(
  context: DatabaseEntityFactoryContext,
): Partial<import('./entity-factory-context').DatabaseEntityClasses> {
  const { defineEntity, p } = context;

  const VoteResultSchema = defineEntity({
    name: 'VoteResultEntity',
    tableName: 'vote_results',
    uniques: [
      {
        name: 'vote_results_vote_detail_id_candidate_id_unique',
        properties: ['voteDetail', 'candidate'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      voteDetail: () =>
        p
          .manyToOne(getEntity(context, 'VoteDetailEntity'))
          .fieldName('vote_detail_id')
          .inversedBy('results')
          .deleteRule('cascade'),
      candidate: () =>
        p
          .manyToOne(getEntity(context, 'CandidateEntity'))
          .fieldName('candidate_id')
          .inversedBy('results')
          .deleteRule('cascade'),
      voteCount: p.integer().fieldName('vote_count'),
      weightedVoteCount: p.decimal('number').fieldName('weighted_vote_count'),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
    },
  });
  class VoteResultEntity extends VoteResultSchema.class {}
  VoteResultSchema.setClass(VoteResultEntity);

  const VoteContentChangeHistorySchema = defineEntity({
    name: 'VoteContentChangeHistoryEntity',
    tableName: 'vote_content_change_histories',
    properties: {
      id: p.uuid().primary(),
      vote: () =>
        p
          .manyToOne(getEntity(context, 'VoteEntity'))
          .fieldName('vote_id')
          .inversedBy('contentChangeHistories')
          .deleteRule('cascade'),
      voteDetail: () =>
        p
          .manyToOne(getEntity(context, 'VoteDetailEntity'))
          .fieldName('vote_detail_id')
          .inversedBy('contentChangeHistories')
          .nullable()
          .deleteRule('set null'),
      candidate: () =>
        p
          .manyToOne(getEntity(context, 'CandidateEntity'))
          .fieldName('candidate_id')
          .inversedBy('contentChangeHistories')
          .nullable()
          .deleteRule('set null'),
      voteAttachment: () =>
        p
          .manyToOne(getEntity(context, 'VoteAttachmentEntity'))
          .fieldName('vote_attachment_id')
          .inversedBy('contentChangeHistories')
          .nullable()
          .deleteRule('set null'),
      candidateAttachment: () =>
        p
          .manyToOne(getEntity(context, 'CandidateAttachmentEntity'))
          .fieldName('candidate_attachment_id')
          .inversedBy('contentChangeHistories')
          .nullable()
          .deleteRule('set null'),
      targetType: p
        .string()
        .$type<ContentChangeTargetType>()
        .fieldName('target_type'),
      action: p.string().$type<ContentChangeAction>(),
      fieldName: p.string().fieldName('field_name').nullable(),
      oldValue: p.json<unknown>().fieldName('old_value').nullable(),
      newValue: p.json<unknown>().fieldName('new_value').nullable(),
      snapshotBefore: p.json<unknown>().fieldName('snapshot_before').nullable(),
      snapshotAfter: p.json<unknown>().fieldName('snapshot_after').nullable(),
      changeReason: p.string().fieldName('change_reason').nullable(),
      actorType: p
        .string()
        .$type<ContentChangeActorType>()
        .fieldName('actor_type'),
      actorId: p.string().fieldName('actor_id').nullable(),
      changedAt: p.datetime().fieldName('changed_at'),
      createdAt: p.datetime().fieldName('created_at'),
    },
  });
  class VoteContentChangeHistoryEntity
    extends VoteContentChangeHistorySchema.class {}
  VoteContentChangeHistorySchema.setClass(VoteContentChangeHistoryEntity);

  const VoteResultStorageRecordSchema = defineEntity({
    name: 'VoteResultStorageRecordEntity',
    tableName: 'vote_result_storage_records',
    properties: {
      id: p.uuid().primary(),
      voteDetail: () =>
        p
          .manyToOne(getEntity(context, 'VoteDetailEntity'))
          .fieldName('vote_detail_id')
          .inversedBy('resultStorageRecords')
          .deleteRule('cascade'),
      storageMode: p
        .string()
        .$type<ResultStorageMode>()
        .fieldName('storage_mode'),
      status: p.string().$type<ResultStorageStatus>(),
      resultSnapshot: p.json<unknown>().fieldName('result_snapshot'),
      resultHash: p.string().fieldName('result_hash'),
      blockchainNetwork: p.string().fieldName('blockchain_network').nullable(),
      blockchainContractAddress: p
        .string()
        .fieldName('blockchain_contract_address')
        .nullable(),
      blockchainTxHash: p.string().fieldName('blockchain_tx_hash').nullable(),
      blockchainBlockNumber: p
        .string()
        .fieldName('blockchain_block_number')
        .nullable(),
      blockchainRecordedAt: p
        .datetime()
        .fieldName('blockchain_recorded_at')
        .nullable(),
      errorMessage: p.text().fieldName('error_message').nullable(),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
    },
  });
  class VoteResultStorageRecordEntity
    extends VoteResultStorageRecordSchema.class {}
  VoteResultStorageRecordSchema.setClass(VoteResultStorageRecordEntity);

  return {
    VoteResultEntity,
    VoteContentChangeHistoryEntity,
    VoteResultStorageRecordEntity,
  };
}
