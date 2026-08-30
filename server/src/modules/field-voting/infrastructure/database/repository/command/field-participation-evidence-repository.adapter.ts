import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { FieldParticipationEvidenceRepositoryPort } from '../../../../application/port/persistence/command/field-participation-evidence-repository.port';
import type { FieldParticipationEvidenceAggregate } from '../../../../domain/field-participation-evidence.aggregate';
import {
  entityReference,
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from '../../../../../../platform/database/repository/database-repository.util';

@Injectable()
export class FieldParticipationEvidenceRepositoryAdapter implements FieldParticipationEvidenceRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async save(evidence: FieldParticipationEvidenceAggregate): Promise<void> {
    const {
      ElectionCommissionMemberEntity,
      FieldParticipationEvidenceEntity,
      FieldVotingSessionEntity,
      FileEntity,
      VoteParticipationEntity,
    } = await getDatabaseEntities();
    const now = new Date();

    await saveEntity(
      this.em,
      FieldParticipationEvidenceEntity,
      evidence.id,
      {
        createdAt: now,
      },
      {
        participation: entityReference(
          this.em,
          VoteParticipationEntity,
          evidence.participationId,
        ),
        fieldVotingSession: entityReference(
          this.em,
          FieldVotingSessionEntity,
          evidence.fieldVotingSessionId,
        ),
        verifiedByCommissionMember: entityReference(
          this.em,
          ElectionCommissionMemberEntity,
          evidence.verifiedByCommissionMemberId,
        ),
        evidenceFile: evidence.evidenceFileId
          ? entityReference(this.em, FileEntity, evidence.evidenceFileId)
          : null,
        verificationNote: evidence.verificationNote ?? null,
        verifiedAt: evidence.verifiedAt,
      },
    );
  }
}
