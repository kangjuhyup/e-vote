import type { AnyEntity, EntityClass } from '@mikro-orm/core';
import type {
  CandidateAttachmentType,
  CandidateStatus,
  ContentChangeAction,
  ContentChangeActorType,
  ContentChangeTargetType,
  ElectionCommissionMemberRole,
  ElectionCommissionMemberStatus,
  ElectionCommissionStatus,
  ElectorAttachmentType,
  ElectorStatus,
  FileStatus,
  FieldVotingSessionStatus,
  IdentityVerificationMethod,
  IdentityVerificationProvider,
  IdentityVerificationStatus,
  ParticipationStatus,
  ParticipationUnit,
  PrivacyMode,
  ResultStorageMode,
  ResultStorageStatus,
  VoteAttachmentType,
  VoteDetailType,
  VoteStatus,
  VoteWeightMode,
  VotingChannel,
} from './type/database-enum.type';

export interface DatabaseEntityRegistry {
  readonly ElectionCommissionEntity: EntityClass<AnyEntity>;
  readonly ElectionCommissionMemberEntity: EntityClass<AnyEntity>;
  readonly VoteEntity: EntityClass<AnyEntity>;
  readonly VoteVotingChannelEntity: EntityClass<AnyEntity>;
  readonly VoteDetailEntity: EntityClass<AnyEntity>;
  readonly ElectorEntity: EntityClass<AnyEntity>;
  readonly CandidateEntity: EntityClass<AnyEntity>;
  readonly FieldVotingSessionEntity: EntityClass<AnyEntity>;
  readonly FieldVotingSessionManagerEntity: EntityClass<AnyEntity>;
  readonly VoteParticipationEntity: EntityClass<AnyEntity>;
  readonly FieldParticipationEvidenceEntity: EntityClass<AnyEntity>;
  readonly VoteResultEntity: EntityClass<AnyEntity>;
  readonly FileEntity: EntityClass<AnyEntity>;
  readonly VoteAttachmentEntity: EntityClass<AnyEntity>;
  readonly ElectorAttachmentEntity: EntityClass<AnyEntity>;
  readonly CandidateAttachmentEntity: EntityClass<AnyEntity>;
  readonly ElectorIdentityVerificationEntity: EntityClass<AnyEntity>;
  readonly VoteContentChangeHistoryEntity: EntityClass<AnyEntity>;
  readonly VoteResultStorageRecordEntity: EntityClass<AnyEntity>;
  readonly databaseEntities: EntityClass<AnyEntity>[];
}

let cachedRegistry: DatabaseEntityRegistry | null = null;

export async function createDatabaseEntityRegistry(): Promise<DatabaseEntityRegistry> {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  const { defineEntity, p } = await import('@mikro-orm/postgresql');

  const ElectionCommissionSchema = defineEntity({
    name: 'ElectionCommissionEntity',
    tableName: 'election_commissions',
    properties: {
      id: p.uuid().primary(),
      name: p.string(),
      status: p.string().$type<ElectionCommissionStatus>(),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      members: () =>
        p.oneToMany(ElectionCommissionMemberEntity).mappedBy('commission'),
      votes: () => p.oneToMany(VoteEntity).mappedBy('commission'),
      fieldVotingSessions: () =>
        p.oneToMany(FieldVotingSessionEntity).mappedBy('commission'),
    },
  });
  class ElectionCommissionEntity extends ElectionCommissionSchema.class {}
  ElectionCommissionSchema.setClass(ElectionCommissionEntity);

  const VoteSchema = defineEntity({
    name: 'VoteEntity',
    tableName: 'votes',
    properties: {
      id: p.uuid().primary(),
      commission: () =>
        p
          .manyToOne(ElectionCommissionEntity)
          .fieldName('commission_id')
          .inversedBy('votes')
          .deleteRule('restrict'),
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
        p.oneToMany(VoteVotingChannelEntity).mappedBy('vote'),
      voteDetails: () => p.oneToMany(VoteDetailEntity).mappedBy('vote'),
      electors: () => p.oneToMany(ElectorEntity).mappedBy('vote'),
      attachments: () => p.oneToMany(VoteAttachmentEntity).mappedBy('vote'),
      contentChangeHistories: () =>
        p.oneToMany(VoteContentChangeHistoryEntity).mappedBy('vote'),
    },
  });
  class VoteEntity extends VoteSchema.class {}
  VoteSchema.setClass(VoteEntity);

  const ElectionCommissionMemberSchema = defineEntity({
    name: 'ElectionCommissionMemberEntity',
    tableName: 'election_commission_members',
    properties: {
      id: p.uuid().primary(),
      commission: () =>
        p
          .manyToOne(ElectionCommissionEntity)
          .fieldName('commission_id')
          .inversedBy('members')
          .deleteRule('cascade'),
      name: p.string(),
      role: p.string().$type<ElectionCommissionMemberRole>(),
      status: p.string().$type<ElectionCommissionMemberStatus>(),
      registeredAt: p.datetime().fieldName('registered_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      fieldVotingSessionManagerLinks: () =>
        p
          .oneToMany(FieldVotingSessionManagerEntity)
          .mappedBy('commissionMember'),
      verifiedFieldParticipationEvidences: () =>
        p
          .oneToMany(FieldParticipationEvidenceEntity)
          .mappedBy('verifiedByCommissionMember'),
    },
  });
  class ElectionCommissionMemberEntity
    extends ElectionCommissionMemberSchema.class {}
  ElectionCommissionMemberSchema.setClass(ElectionCommissionMemberEntity);

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
          .manyToOne(VoteEntity)
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
          .manyToOne(VoteEntity)
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
      candidates: () => p.oneToMany(CandidateEntity).mappedBy('voteDetail'),
      participations: () =>
        p.oneToMany(VoteParticipationEntity).mappedBy('voteDetail'),
      results: () => p.oneToMany(VoteResultEntity).mappedBy('voteDetail'),
      contentChangeHistories: () =>
        p.oneToMany(VoteContentChangeHistoryEntity).mappedBy('voteDetail'),
      resultStorageRecords: () =>
        p.oneToMany(VoteResultStorageRecordEntity).mappedBy('voteDetail'),
    },
  });
  class VoteDetailEntity extends VoteDetailSchema.class {}
  VoteDetailSchema.setClass(VoteDetailEntity);

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
          .manyToOne(VoteEntity)
          .fieldName('vote_id')
          .inversedBy('electors')
          .deleteRule('cascade'),
      name: p.string(),
      identifier: p.string(),
      groupKey: p.string().fieldName('group_key').nullable(),
      voteWeight: p.decimal('number').fieldName('vote_weight').default(1),
      status: p.string().$type<ElectorStatus>(),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      participations: () =>
        p.oneToMany(VoteParticipationEntity).mappedBy('elector'),
      attachments: () =>
        p.oneToMany(ElectorAttachmentEntity).mappedBy('elector'),
      identityVerifications: () =>
        p.oneToMany(ElectorIdentityVerificationEntity).mappedBy('elector'),
    },
  });
  class ElectorEntity extends ElectorSchema.class {}
  ElectorSchema.setClass(ElectorEntity);

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
          .manyToOne(VoteDetailEntity)
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
        p.oneToMany(VoteParticipationEntity).mappedBy('candidate'),
      results: () => p.oneToMany(VoteResultEntity).mappedBy('candidate'),
      attachments: () =>
        p.oneToMany(CandidateAttachmentEntity).mappedBy('candidate'),
      contentChangeHistories: () =>
        p.oneToMany(VoteContentChangeHistoryEntity).mappedBy('candidate'),
    },
  });
  class CandidateEntity extends CandidateSchema.class {}
  CandidateSchema.setClass(CandidateEntity);

  const FieldVotingSessionSchema = defineEntity({
    name: 'FieldVotingSessionEntity',
    tableName: 'field_voting_sessions',
    properties: {
      id: p.uuid().primary(),
      commission: () =>
        p
          .manyToOne(ElectionCommissionEntity)
          .fieldName('commission_id')
          .inversedBy('fieldVotingSessions')
          .deleteRule('cascade'),
      vote: () =>
        p.manyToOne(VoteEntity).fieldName('vote_id').deleteRule('cascade'),
      channel: p.string().$type<VotingChannel>(),
      title: p.string(),
      locationName: p.string().fieldName('location_name'),
      address: p.string(),
      startsAt: p.datetime().fieldName('starts_at'),
      endsAt: p.datetime().fieldName('ends_at'),
      status: p.string().$type<FieldVotingSessionStatus>(),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      managerLinks: () =>
        p
          .oneToMany(FieldVotingSessionManagerEntity)
          .mappedBy('fieldVotingSession'),
      participations: () =>
        p.oneToMany(VoteParticipationEntity).mappedBy('fieldVotingSession'),
      evidences: () =>
        p
          .oneToMany(FieldParticipationEvidenceEntity)
          .mappedBy('fieldVotingSession'),
    },
  });
  class FieldVotingSessionEntity extends FieldVotingSessionSchema.class {}
  FieldVotingSessionSchema.setClass(FieldVotingSessionEntity);

  const VoteParticipationSchema = defineEntity({
    name: 'VoteParticipationEntity',
    tableName: 'vote_participations',
    uniques: [
      {
        name: 'vote_participations_vote_detail_id_elector_id_unique',
        properties: ['voteDetail', 'elector'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      voteDetail: () =>
        p
          .manyToOne(VoteDetailEntity)
          .fieldName('vote_detail_id')
          .inversedBy('participations')
          .deleteRule('cascade'),
      elector: () =>
        p
          .manyToOne(ElectorEntity)
          .fieldName('elector_id')
          .inversedBy('participations')
          .deleteRule('cascade'),
      candidate: () =>
        p
          .manyToOne(CandidateEntity)
          .fieldName('candidate_id')
          .inversedBy('participations')
          .nullable()
          .deleteRule('set null'),
      groupKey: p.string().fieldName('group_key').nullable(),
      voteWeight: p.decimal('number').fieldName('vote_weight'),
      votingChannel: p
        .string()
        .$type<VotingChannel>()
        .fieldName('voting_channel'),
      fieldVotingSession: () =>
        p
          .manyToOne(FieldVotingSessionEntity)
          .fieldName('field_voting_session_id')
          .inversedBy('participations')
          .nullable()
          .deleteRule('set null'),
      status: p.string().$type<ParticipationStatus>(),
      participatedAt: p.datetime().fieldName('participated_at'),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      fieldParticipationEvidences: () =>
        p.oneToMany(FieldParticipationEvidenceEntity).mappedBy('participation'),
    },
  });
  class VoteParticipationEntity extends VoteParticipationSchema.class {}
  VoteParticipationSchema.setClass(VoteParticipationEntity);

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
          .manyToOne(VoteDetailEntity)
          .fieldName('vote_detail_id')
          .inversedBy('results')
          .deleteRule('cascade'),
      candidate: () =>
        p
          .manyToOne(CandidateEntity)
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

  const FileSchema = defineEntity({
    name: 'FileEntity',
    tableName: 'files',
    uniques: [
      {
        name: 'files_storage_key_unique',
        properties: ['storageKey'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      storageKey: p.string().fieldName('storage_key'),
      originalName: p.string().fieldName('original_name'),
      mimeType: p.string().fieldName('mime_type'),
      sizeBytes: p.integer().fieldName('size_bytes'),
      checksum: p.string().nullable(),
      status: p.string().$type<FileStatus>(),
      createdAt: p.datetime().fieldName('created_at'),
      deletedAt: p.datetime().fieldName('deleted_at').nullable(),
      voteAttachments: () => p.oneToMany(VoteAttachmentEntity).mappedBy('file'),
      electorAttachments: () =>
        p.oneToMany(ElectorAttachmentEntity).mappedBy('file'),
      candidateAttachments: () =>
        p.oneToMany(CandidateAttachmentEntity).mappedBy('file'),
      fieldParticipationEvidences: () =>
        p.oneToMany(FieldParticipationEvidenceEntity).mappedBy('evidenceFile'),
    },
  });
  class FileEntity extends FileSchema.class {}
  FileSchema.setClass(FileEntity);

  const FieldVotingSessionManagerSchema = defineEntity({
    name: 'FieldVotingSessionManagerEntity',
    tableName: 'field_voting_session_managers',
    uniques: [
      {
        name: 'field_voting_session_managers_session_member_unique',
        properties: ['fieldVotingSession', 'commissionMember'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      fieldVotingSession: () =>
        p
          .manyToOne(FieldVotingSessionEntity)
          .fieldName('field_voting_session_id')
          .inversedBy('managerLinks')
          .deleteRule('cascade'),
      commissionMember: () =>
        p
          .manyToOne(ElectionCommissionMemberEntity)
          .fieldName('commission_member_id')
          .inversedBy('fieldVotingSessionManagerLinks')
          .deleteRule('cascade'),
      assignedAt: p.datetime().fieldName('assigned_at'),
    },
  });
  class FieldVotingSessionManagerEntity
    extends FieldVotingSessionManagerSchema.class {}
  FieldVotingSessionManagerSchema.setClass(FieldVotingSessionManagerEntity);

  const FieldParticipationEvidenceSchema = defineEntity({
    name: 'FieldParticipationEvidenceEntity',
    tableName: 'field_participation_evidences',
    uniques: [
      {
        name: 'field_participation_evidences_participation_id_unique',
        properties: ['participation'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      participation: () =>
        p
          .manyToOne(VoteParticipationEntity)
          .fieldName('participation_id')
          .inversedBy('fieldParticipationEvidences')
          .deleteRule('cascade'),
      fieldVotingSession: () =>
        p
          .manyToOne(FieldVotingSessionEntity)
          .fieldName('field_voting_session_id')
          .inversedBy('evidences')
          .deleteRule('cascade'),
      verifiedByCommissionMember: () =>
        p
          .manyToOne(ElectionCommissionMemberEntity)
          .fieldName('verified_by_commission_member_id')
          .inversedBy('verifiedFieldParticipationEvidences')
          .deleteRule('restrict'),
      evidenceFile: () =>
        p
          .manyToOne(FileEntity)
          .fieldName('evidence_file_id')
          .inversedBy('fieldParticipationEvidences')
          .nullable()
          .deleteRule('set null'),
      verificationNote: p.text().fieldName('verification_note').nullable(),
      verifiedAt: p.datetime().fieldName('verified_at'),
      createdAt: p.datetime().fieldName('created_at'),
    },
  });
  class FieldParticipationEvidenceEntity
    extends FieldParticipationEvidenceSchema.class {}
  FieldParticipationEvidenceSchema.setClass(FieldParticipationEvidenceEntity);

  const VoteAttachmentSchema = defineEntity({
    name: 'VoteAttachmentEntity',
    tableName: 'vote_attachments',
    uniques: [
      {
        name: 'vote_attachments_vote_id_file_id_unique',
        properties: ['vote', 'file'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      vote: () =>
        p
          .manyToOne(VoteEntity)
          .fieldName('vote_id')
          .inversedBy('attachments')
          .deleteRule('cascade'),
      file: () =>
        p
          .manyToOne(FileEntity)
          .fieldName('file_id')
          .inversedBy('voteAttachments')
          .deleteRule('cascade'),
      type: p.string().$type<VoteAttachmentType>(),
      sortOrder: p.integer().fieldName('sort_order'),
      createdAt: p.datetime().fieldName('created_at'),
      contentChangeHistories: () =>
        p.oneToMany(VoteContentChangeHistoryEntity).mappedBy('voteAttachment'),
    },
  });
  class VoteAttachmentEntity extends VoteAttachmentSchema.class {}
  VoteAttachmentSchema.setClass(VoteAttachmentEntity);

  const ElectorAttachmentSchema = defineEntity({
    name: 'ElectorAttachmentEntity',
    tableName: 'elector_attachments',
    uniques: [
      {
        name: 'elector_attachments_elector_id_file_id_unique',
        properties: ['elector', 'file'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      elector: () =>
        p
          .manyToOne(ElectorEntity)
          .fieldName('elector_id')
          .inversedBy('attachments')
          .deleteRule('cascade'),
      file: () =>
        p
          .manyToOne(FileEntity)
          .fieldName('file_id')
          .inversedBy('electorAttachments')
          .deleteRule('cascade'),
      type: p.string().$type<ElectorAttachmentType>(),
      createdAt: p.datetime().fieldName('created_at'),
    },
  });
  class ElectorAttachmentEntity extends ElectorAttachmentSchema.class {}
  ElectorAttachmentSchema.setClass(ElectorAttachmentEntity);

  const CandidateAttachmentSchema = defineEntity({
    name: 'CandidateAttachmentEntity',
    tableName: 'candidate_attachments',
    uniques: [
      {
        name: 'candidate_attachments_candidate_id_file_id_unique',
        properties: ['candidate', 'file'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      candidate: () =>
        p
          .manyToOne(CandidateEntity)
          .fieldName('candidate_id')
          .inversedBy('attachments')
          .deleteRule('cascade'),
      file: () =>
        p
          .manyToOne(FileEntity)
          .fieldName('file_id')
          .inversedBy('candidateAttachments')
          .deleteRule('cascade'),
      type: p.string().$type<CandidateAttachmentType>(),
      sortOrder: p.integer().fieldName('sort_order'),
      createdAt: p.datetime().fieldName('created_at'),
      contentChangeHistories: () =>
        p
          .oneToMany(VoteContentChangeHistoryEntity)
          .mappedBy('candidateAttachment'),
    },
  });
  class CandidateAttachmentEntity extends CandidateAttachmentSchema.class {}
  CandidateAttachmentSchema.setClass(CandidateAttachmentEntity);

  const ElectorIdentityVerificationSchema = defineEntity({
    name: 'ElectorIdentityVerificationEntity',
    tableName: 'elector_identity_verifications',
    properties: {
      id: p.uuid().primary(),
      elector: () =>
        p
          .manyToOne(ElectorEntity)
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

  const VoteContentChangeHistorySchema = defineEntity({
    name: 'VoteContentChangeHistoryEntity',
    tableName: 'vote_content_change_histories',
    properties: {
      id: p.uuid().primary(),
      vote: () =>
        p
          .manyToOne(VoteEntity)
          .fieldName('vote_id')
          .inversedBy('contentChangeHistories')
          .deleteRule('cascade'),
      voteDetail: () =>
        p
          .manyToOne(VoteDetailEntity)
          .fieldName('vote_detail_id')
          .inversedBy('contentChangeHistories')
          .nullable()
          .deleteRule('set null'),
      candidate: () =>
        p
          .manyToOne(CandidateEntity)
          .fieldName('candidate_id')
          .inversedBy('contentChangeHistories')
          .nullable()
          .deleteRule('set null'),
      voteAttachment: () =>
        p
          .manyToOne(VoteAttachmentEntity)
          .fieldName('vote_attachment_id')
          .inversedBy('contentChangeHistories')
          .nullable()
          .deleteRule('set null'),
      candidateAttachment: () =>
        p
          .manyToOne(CandidateAttachmentEntity)
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
          .manyToOne(VoteDetailEntity)
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

  const databaseEntities = [
    ElectionCommissionEntity,
    ElectionCommissionMemberEntity,
    VoteEntity,
    VoteVotingChannelEntity,
    VoteDetailEntity,
    ElectorEntity,
    CandidateEntity,
    FieldVotingSessionEntity,
    FieldVotingSessionManagerEntity,
    VoteParticipationEntity,
    FieldParticipationEvidenceEntity,
    VoteResultEntity,
    FileEntity,
    VoteAttachmentEntity,
    ElectorAttachmentEntity,
    CandidateAttachmentEntity,
    ElectorIdentityVerificationEntity,
    VoteContentChangeHistoryEntity,
    VoteResultStorageRecordEntity,
  ];

  cachedRegistry = {
    ElectionCommissionEntity,
    ElectionCommissionMemberEntity,
    VoteEntity,
    VoteVotingChannelEntity,
    VoteDetailEntity,
    ElectorEntity,
    CandidateEntity,
    FieldVotingSessionEntity,
    FieldVotingSessionManagerEntity,
    VoteParticipationEntity,
    FieldParticipationEvidenceEntity,
    VoteResultEntity,
    FileEntity,
    VoteAttachmentEntity,
    ElectorAttachmentEntity,
    CandidateAttachmentEntity,
    ElectorIdentityVerificationEntity,
    VoteContentChangeHistoryEntity,
    VoteResultStorageRecordEntity,
    databaseEntities,
  };

  return cachedRegistry;
}
