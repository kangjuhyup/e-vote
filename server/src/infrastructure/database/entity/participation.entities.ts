import {
  getEntity,
  type DatabaseEntityFactoryContext,
} from './entity-factory-context';
import type {
  FieldVotingSessionStatus,
  ParticipationStatus,
  VotingChannel,
} from './type/database-enum.type';

export function createParticipationEntities(
  context: DatabaseEntityFactoryContext,
): Partial<import('./entity-factory-context').DatabaseEntityClasses> {
  const { defineEntity, p } = context;

  const FieldVotingSessionSchema = defineEntity({
    name: 'FieldVotingSessionEntity',
    tableName: 'field_voting_sessions',
    properties: {
      id: p.uuid().primary(),
      commission: () =>
        p
          .manyToOne(getEntity(context, 'ElectionCommissionEntity'))
          .fieldName('commission_id')
          .inversedBy('fieldVotingSessions')
          .deleteRule('cascade'),
      vote: () =>
        p
          .manyToOne(getEntity(context, 'VoteEntity'))
          .fieldName('vote_id')
          .deleteRule('cascade'),
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
          .oneToMany(getEntity(context, 'FieldVotingSessionManagerEntity'))
          .mappedBy('fieldVotingSession'),
      participations: () =>
        p
          .oneToMany(getEntity(context, 'VoteParticipationEntity'))
          .mappedBy('fieldVotingSession'),
      evidences: () =>
        p
          .oneToMany(getEntity(context, 'FieldParticipationEvidenceEntity'))
          .mappedBy('fieldVotingSession'),
    },
  });
  class FieldVotingSessionEntity extends FieldVotingSessionSchema.class {}
  FieldVotingSessionSchema.setClass(FieldVotingSessionEntity);

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
          .manyToOne(getEntity(context, 'FieldVotingSessionEntity'))
          .fieldName('field_voting_session_id')
          .inversedBy('managerLinks')
          .deleteRule('cascade'),
      commissionMember: () =>
        p
          .manyToOne(getEntity(context, 'ElectionCommissionMemberEntity'))
          .fieldName('commission_member_id')
          .inversedBy('fieldVotingSessionManagerLinks')
          .deleteRule('cascade'),
      assignedAt: p.datetime().fieldName('assigned_at'),
    },
  });
  class FieldVotingSessionManagerEntity
    extends FieldVotingSessionManagerSchema.class {}
  FieldVotingSessionManagerSchema.setClass(FieldVotingSessionManagerEntity);

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
          .manyToOne(getEntity(context, 'VoteDetailEntity'))
          .fieldName('vote_detail_id')
          .inversedBy('participations')
          .deleteRule('cascade'),
      elector: () =>
        p
          .manyToOne(getEntity(context, 'ElectorEntity'))
          .fieldName('elector_id')
          .inversedBy('participations')
          .deleteRule('cascade'),
      candidate: () =>
        p
          .manyToOne(getEntity(context, 'CandidateEntity'))
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
          .manyToOne(getEntity(context, 'FieldVotingSessionEntity'))
          .fieldName('field_voting_session_id')
          .inversedBy('participations')
          .nullable()
          .deleteRule('set null'),
      status: p.string().$type<ParticipationStatus>(),
      participatedAt: p.datetime().fieldName('participated_at'),
      createdAt: p.datetime().fieldName('created_at'),
      updatedAt: p.datetime().fieldName('updated_at'),
      fieldParticipationEvidences: () =>
        p
          .oneToMany(getEntity(context, 'FieldParticipationEvidenceEntity'))
          .mappedBy('participation'),
    },
  });
  class VoteParticipationEntity extends VoteParticipationSchema.class {}
  VoteParticipationSchema.setClass(VoteParticipationEntity);

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
          .manyToOne(getEntity(context, 'VoteParticipationEntity'))
          .fieldName('participation_id')
          .inversedBy('fieldParticipationEvidences')
          .deleteRule('cascade'),
      fieldVotingSession: () =>
        p
          .manyToOne(getEntity(context, 'FieldVotingSessionEntity'))
          .fieldName('field_voting_session_id')
          .inversedBy('evidences')
          .deleteRule('cascade'),
      verifiedByCommissionMember: () =>
        p
          .manyToOne(getEntity(context, 'ElectionCommissionMemberEntity'))
          .fieldName('verified_by_commission_member_id')
          .inversedBy('verifiedFieldParticipationEvidences')
          .deleteRule('restrict'),
      evidenceFile: () =>
        p
          .manyToOne(getEntity(context, 'FileEntity'))
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

  return {
    FieldVotingSessionEntity,
    FieldVotingSessionManagerEntity,
    VoteParticipationEntity,
    FieldParticipationEvidenceEntity,
  };
}
