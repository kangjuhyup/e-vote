import type { VoteDetailStatus } from '../../../../../../shared/domain/voting/type/vote-status.type';

export class ManageVoteDetailResult {
  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly status: VoteDetailStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly voteId: string;
    readonly status: VoteDetailStatus;
  }): ManageVoteDetailResult {
    return new ManageVoteDetailResult(params.id, params.voteId, params.status);
  }
}
