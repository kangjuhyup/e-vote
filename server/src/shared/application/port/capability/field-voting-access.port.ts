import type { FieldVotingSessionReference } from '../../../domain/voting/capability-reference';

export const FIELD_VOTING_SESSION_ACCESS_PORT = Symbol(
  'FIELD_VOTING_SESSION_ACCESS_PORT',
);

export interface FieldVotingSessionAccessPort {
  findById(id: string): Promise<FieldVotingSessionReference | undefined>;
}
