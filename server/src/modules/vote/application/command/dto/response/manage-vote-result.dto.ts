import type { VoteStatus } from '../../../../../../shared/domain/voting/type/vote-status.type';

export class ManageVoteResult {
  private constructor(
    readonly id: string,
    readonly status: VoteStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly status: VoteStatus;
  }): ManageVoteResult {
    return new ManageVoteResult(params.id, params.status);
  }
}
