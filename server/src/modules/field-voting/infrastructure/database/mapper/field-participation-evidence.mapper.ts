import { FieldParticipationEvidenceAggregate } from '../../../domain/field-participation-evidence.aggregate';
import { EntityRelationReference } from '../../../../../platform/database/mapper/mapper-relation.type';

export type FieldParticipationEvidencePersistence = {
  readonly id: string;
  readonly participation: EntityRelationReference;
  readonly fieldVotingSession: EntityRelationReference;
  readonly verifiedByCommissionMember: EntityRelationReference;
  readonly evidenceFile: EntityRelationReference | null;
  readonly verificationNote: string | null;
  readonly verifiedAt: Date;
};

export class FieldParticipationEvidenceMapper {
  static toDomain(
    entity: FieldParticipationEvidencePersistence,
  ): FieldParticipationEvidenceAggregate {
    return FieldParticipationEvidenceAggregate.reconstitute({
      id: entity.id,
      participationId: entity.participation.id,
      fieldVotingSessionId: entity.fieldVotingSession.id,
      verifiedByCommissionMemberId: entity.verifiedByCommissionMember.id,
      evidenceFileId: entity.evidenceFile?.id,
      verificationNote: entity.verificationNote ?? undefined,
      verifiedAt: entity.verifiedAt,
    });
  }
}
