import type { FieldParticipationEvidenceAggregate } from '../../../../domain/field-voting/field-participation-evidence.aggregate';

export const FIELD_PARTICIPATION_EVIDENCE_REPOSITORY_PORT = Symbol(
  'FIELD_PARTICIPATION_EVIDENCE_REPOSITORY_PORT',
);

export interface FieldParticipationEvidenceRepositoryPort {
  nextId(): string;
  save(evidence: FieldParticipationEvidenceAggregate): Promise<void>;
}
