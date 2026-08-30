import type {
  FieldVotingSessionPageView,
  FieldVotingSessionView,
} from '../../../query/view/field-voting-session.view';

export const FIELD_VOTING_SESSION_READ_REPOSITORY_PORT = Symbol(
  'FIELD_VOTING_SESSION_READ_REPOSITORY_PORT',
);

export interface FieldVotingSessionReadRepositoryPort {
  findDetailById(
    fieldVotingSessionId: string,
  ): Promise<FieldVotingSessionView | undefined>;
  findPage(request: {
    readonly voteId: string;
    readonly page: number;
    readonly pageSize: number;
  }): Promise<FieldVotingSessionPageView>;
}
