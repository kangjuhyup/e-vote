import {
  getEntity,
  type DatabaseEntityFactoryContext,
} from '../../../../../platform/database/entity/entity-factory-context';
import type {
  CandidateAttachmentType,
  ElectorAttachmentType,
  FileStatus,
  VoteAttachmentType,
  VoteDetailAttachmentType,
} from '../../../../../platform/database/entity/type/database-enum.type';

export function createAttachmentEntities(
  context: DatabaseEntityFactoryContext,
): Partial<
  import('../../../../../platform/database/entity/entity-factory-context').DatabaseEntityClasses
> {
  const { defineEntity, p } = context;

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
      voteAttachments: () =>
        p
          .oneToMany(getEntity(context, 'VoteAttachmentEntity'))
          .mappedBy('file'),
      voteDetailAttachments: () =>
        p
          .oneToMany(getEntity(context, 'VoteDetailAttachmentEntity'))
          .mappedBy('file'),
      electorAttachments: () =>
        p
          .oneToMany(getEntity(context, 'ElectorAttachmentEntity'))
          .mappedBy('file'),
      candidateAttachments: () =>
        p
          .oneToMany(getEntity(context, 'CandidateAttachmentEntity'))
          .mappedBy('file'),
      fieldParticipationEvidences: () =>
        p
          .oneToMany(getEntity(context, 'FieldParticipationEvidenceEntity'))
          .mappedBy('evidenceFile'),
    },
  });
  class FileEntity extends FileSchema.class {}
  FileSchema.setClass(FileEntity);

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
          .manyToOne(getEntity(context, 'VoteEntity'))
          .fieldName('vote_id')
          .inversedBy('attachments')
          .deleteRule('cascade'),
      file: () =>
        p
          .manyToOne(getEntity(context, 'FileEntity'))
          .fieldName('file_id')
          .inversedBy('voteAttachments')
          .deleteRule('cascade'),
      type: p.string().$type<VoteAttachmentType>(),
      sortOrder: p.integer().fieldName('sort_order'),
      createdAt: p.datetime().fieldName('created_at'),
      contentChangeHistories: () =>
        p
          .oneToMany(getEntity(context, 'VoteContentChangeHistoryEntity'))
          .mappedBy('voteAttachment'),
    },
  });
  class VoteAttachmentEntity extends VoteAttachmentSchema.class {}
  VoteAttachmentSchema.setClass(VoteAttachmentEntity);

  const VoteDetailAttachmentSchema = defineEntity({
    name: 'VoteDetailAttachmentEntity',
    tableName: 'vote_detail_attachments',
    uniques: [
      {
        name: 'vote_detail_attachments_vote_detail_id_file_id_unique',
        properties: ['voteDetail', 'file'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      voteDetail: () =>
        p
          .manyToOne(getEntity(context, 'VoteDetailEntity'))
          .fieldName('vote_detail_id')
          .inversedBy('attachments')
          .deleteRule('cascade'),
      file: () =>
        p
          .manyToOne(getEntity(context, 'FileEntity'))
          .fieldName('file_id')
          .inversedBy('voteDetailAttachments')
          .deleteRule('cascade'),
      type: p.string().$type<VoteDetailAttachmentType>(),
      sortOrder: p.integer().fieldName('sort_order'),
      createdAt: p.datetime().fieldName('created_at'),
    },
  });
  class VoteDetailAttachmentEntity extends VoteDetailAttachmentSchema.class {}
  VoteDetailAttachmentSchema.setClass(VoteDetailAttachmentEntity);

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
          .manyToOne(getEntity(context, 'ElectorEntity'))
          .fieldName('elector_id')
          .inversedBy('attachments')
          .deleteRule('cascade'),
      file: () =>
        p
          .manyToOne(getEntity(context, 'FileEntity'))
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
          .manyToOne(getEntity(context, 'CandidateEntity'))
          .fieldName('candidate_id')
          .inversedBy('attachments')
          .deleteRule('cascade'),
      file: () =>
        p
          .manyToOne(getEntity(context, 'FileEntity'))
          .fieldName('file_id')
          .inversedBy('candidateAttachments')
          .deleteRule('cascade'),
      type: p.string().$type<CandidateAttachmentType>(),
      sortOrder: p.integer().fieldName('sort_order'),
      createdAt: p.datetime().fieldName('created_at'),
      contentChangeHistories: () =>
        p
          .oneToMany(getEntity(context, 'VoteContentChangeHistoryEntity'))
          .mappedBy('candidateAttachment'),
    },
  });
  class CandidateAttachmentEntity extends CandidateAttachmentSchema.class {}
  CandidateAttachmentSchema.setClass(CandidateAttachmentEntity);

  return {
    FileEntity,
    VoteAttachmentEntity,
    VoteDetailAttachmentEntity,
    ElectorAttachmentEntity,
    CandidateAttachmentEntity,
  };
}
