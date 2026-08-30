import type { FieldVotingSessionAggregate } from '../../../../domain/field-voting-session.aggregate';

export const FIELD_VOTING_SESSION_REPOSITORY_PORT = Symbol(
  'FIELD_VOTING_SESSION_REPOSITORY_PORT',
);

export interface FieldVotingSessionRepositoryPort {
  nextId(): string;
  findById(
    fieldVotingSessionId: string,
  ): Promise<FieldVotingSessionAggregate | undefined>;
  save(fieldVotingSession: FieldVotingSessionAggregate): Promise<void>;
}
