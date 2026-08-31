import {
  getEntity,
  type DatabaseEntityFactoryContext,
} from '../../../../../platform/database/entity/entity-factory-context';
import type {
  CandidateStatus,
  IdentityVerificationMethod,
  IdentityVerificationProvider,
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  VoteDetailType,
  VoteStatus,
  VoteWeightMode,
  VotingChannel,
} from '../../../../../platform/database/entity/type/database-enum.type';

export function createVoteEntities(
  context: DatabaseEntityFactoryContext,
): Partial<
  import('../../../../../platform/database/entity/entity-factory-context').DatabaseEntityClasses
> {
  const { defineEntity, p } = context;

  const VoteSchema = defineEntity({
    name: 'VoteEntity',
    tableName: 'votes',
    properties: {
      id: p.uuid().primary(),
      commission: () =>
        p
          .manyToOne(getEntity(context, 'ElectionCommissionEntity'))
          .fieldName('commission_id')
          .inversedBy('votes')
          .deleteRule('restrict'),
      electoralRollSnapshot: () =>
        p
          .manyToOne(getEntity(context, 'ElectoralRollSnapshotEntity'))
          .fieldName('electoral_roll_snapshot_id')
          .inversedBy('votes')
          .deleteRule('restrict')
          .nullable(),
      billingOrderId: p.uuid().fieldName('billing_order_id').nullable(),
      finalizedAt: p.datetime().fieldName('finalized_at').nullable(),
      title: p.string(),
      description: p.text(),
      defaultPrivacyMode: p
        .string()
        .$type<PrivacyMode>()
        .fieldName('default_privacy_mode'),
      defaultParticipationUnit: p
        .string()
        .$type<ParticipationUnit>()
        .fieldName('default_participation_unit'),
      defaultResultStorageMode: p
        .string()
        .$type<ResultStorageMode>()
        .fieldName('default_result_storage_mode'),
      defaultVoteWeightMode: p
        .string()
        .$type<VoteWeightMode>()
        .fieldName('default_vote_weight_mode'),
      identityVerificationRequired: p
        .boolean()
        .fieldName('identity_verification_required'),
      identityVerificationProvider: p
        .string()
        .$type<IdentityVerificationProvider | null>()
        .fieldName('identity_verification_provider')
        .nullable(),
      identityVerificationMethod: p
        .string()
        .$type<IdentityVerificationMethod | null>()
        .fieldName('identity_verification_method')
        .nullable(),
      status: p.string().$type<VoteStatus>(),
      startedAt: p.datetime().fieldName('started_at'),
      endedAt: p.datetime().fieldName('ended_at'),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      votingChannels: () =>
        p
          .oneToMany(getEntity(context, 'VoteVotingChannelEntity'))
          .mappedBy('vote'),
      voteDetails: () =>
        p.oneToMany(getEntity(context, 'VoteDetailEntity')).mappedBy('vote'),
      electors: () =>
        p.oneToMany(getEntity(context, 'ElectorEntity')).mappedBy('vote'),
      attachments: () =>
        p
          .oneToMany(getEntity(context, 'VoteAttachmentEntity'))
          .mappedBy('vote'),
      contentChangeHistories: () =>
        p
          .oneToMany(getEntity(context, 'VoteContentChangeHistoryEntity'))
          .mappedBy('vote'),
      smsDispatches: () =>
        p.oneToMany(getEntity(context, 'SmsDispatchEntity')).mappedBy('vote'),
    },
  });
  class VoteEntity extends VoteSchema.class {}
  VoteSchema.setClass(VoteEntity);

  const VoteVotingChannelSchema = defineEntity({
    name: 'VoteVotingChannelEntity',
    tableName: 'vote_voting_channels',
    uniques: [
      {
        name: 'vote_voting_channels_vote_id_channel_unique',
        properties: ['vote', 'channel'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      vote: () =>
        p
          .manyToOne(getEntity(context, 'VoteEntity'))
          .fieldName('vote_id')
          .inversedBy('votingChannels')
          .deleteRule('cascade'),
      channel: p.string().$type<VotingChannel>(),
      createdAt: p.datetime().fieldName('created_at'),
    },
  });
  class VoteVotingChannelEntity extends VoteVotingChannelSchema.class {}
  VoteVotingChannelSchema.setClass(VoteVotingChannelEntity);

  const VoteDetailSchema = defineEntity({
    name: 'VoteDetailEntity',
    tableName: 'vote_details',
    uniques: [
      {
        name: 'vote_details_vote_id_sort_order_unique',
        properties: ['vote', 'sortOrder'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      vote: () =>
        p
          .manyToOne(getEntity(context, 'VoteEntity'))
          .fieldName('vote_id')
          .inversedBy('voteDetails')
          .deleteRule('cascade'),
      title: p.string(),
      description: p.text(),
      type: p.string().$type<VoteDetailType>(),
      privacyModeOverride: p
        .string()
        .$type<PrivacyMode | null>()
        .fieldName('privacy_mode_override')
        .nullable(),
      participationUnitOverride: p
        .string()
        .$type<ParticipationUnit | null>()
        .fieldName('participation_unit_override')
        .nullable(),
      resultStorageModeOverride: p
        .string()
        .$type<ResultStorageMode | null>()
        .fieldName('result_storage_mode_override')
        .nullable(),
      voteWeightModeOverride: p
        .string()
        .$type<VoteWeightMode | null>()
        .fieldName('vote_weight_mode_override')
        .nullable(),
      sortOrder: p.integer().fieldName('sort_order'),
      status: p.string().$type<VoteStatus>(),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      candidates: () =>
        p
          .oneToMany(getEntity(context, 'CandidateEntity'))
          .mappedBy('voteDetail'),
      participations: () =>
        p
          .oneToMany(getEntity(context, 'VoteParticipationEntity'))
          .mappedBy('voteDetail'),
      results: () =>
        p
          .oneToMany(getEntity(context, 'VoteResultEntity'))
          .mappedBy('voteDetail'),
      attachments: () =>
        p
          .oneToMany(getEntity(context, 'VoteDetailAttachmentEntity'))
          .mappedBy('voteDetail'),
      contentChangeHistories: () =>
        p
          .oneToMany(getEntity(context, 'VoteContentChangeHistoryEntity'))
          .mappedBy('voteDetail'),
      resultStorageRecords: () =>
        p
          .oneToMany(getEntity(context, 'VoteResultStorageRecordEntity'))
          .mappedBy('voteDetail'),
    },
  });
  class VoteDetailEntity extends VoteDetailSchema.class {}
  VoteDetailSchema.setClass(VoteDetailEntity);

  const CandidateSchema = defineEntity({
    name: 'CandidateEntity',
    tableName: 'candidates',
    uniques: [
      {
        name: 'candidates_vote_detail_id_candidate_no_unique',
        properties: ['voteDetail', 'candidateNo'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      voteDetail: () =>
        p
          .manyToOne(getEntity(context, 'VoteDetailEntity'))
          .fieldName('vote_detail_id')
          .inversedBy('candidates')
          .deleteRule('cascade'),
      candidateNo: p.integer().fieldName('candidate_no'),
      name: p.string(),
      description: p.text(),
      status: p.string().$type<CandidateStatus>(),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      participations: () =>
        p
          .oneToMany(getEntity(context, 'VoteParticipationEntity'))
          .mappedBy('candidate'),
      results: () =>
        p
          .oneToMany(getEntity(context, 'VoteResultEntity'))
          .mappedBy('candidate'),
      attachments: () =>
        p
          .oneToMany(getEntity(context, 'CandidateAttachmentEntity'))
          .mappedBy('candidate'),
      contentChangeHistories: () =>
        p
          .oneToMany(getEntity(context, 'VoteContentChangeHistoryEntity'))
          .mappedBy('candidate'),
    },
  });
  class CandidateEntity extends CandidateSchema.class {}
  CandidateSchema.setClass(CandidateEntity);

  return {
    VoteEntity,
    VoteVotingChannelEntity,
    VoteDetailEntity,
    CandidateEntity,
  };
}
