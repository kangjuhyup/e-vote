import type { FieldVotingSessionStatus } from '../../../../../../shared/domain/voting/type/field-voting-session-status.type';

export class CreateFieldVotingSessionResult {
  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly status: FieldVotingSessionStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly voteId: string;
    readonly status: FieldVotingSessionStatus;
  }): CreateFieldVotingSessionResult {
    return new CreateFieldVotingSessionResult(
      params.id,
      params.voteId,
      params.status,
    );
  }
}
