import type { FieldVotingSessionStatus } from '../../../../domain/field-voting/type/field-voting-session-status.type';

export class ChangeFieldVotingSessionStatusResult {
  private constructor(
    readonly id: string,
    readonly status: FieldVotingSessionStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly status: FieldVotingSessionStatus;
  }): ChangeFieldVotingSessionStatusResult {
    return new ChangeFieldVotingSessionStatusResult(params.id, params.status);
  }
}
