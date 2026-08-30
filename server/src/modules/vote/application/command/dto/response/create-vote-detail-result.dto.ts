import type { VoteDetailStatus } from '../../../../../../shared/domain/voting/type/vote-status.type';

export class CreateVoteDetailResult {
  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly status: VoteDetailStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly voteId: string;
    readonly status: VoteDetailStatus;
  }): CreateVoteDetailResult {
    return new CreateVoteDetailResult(params.id, params.voteId, params.status);
  }
}
