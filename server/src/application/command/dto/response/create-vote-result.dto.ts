import type { VoteStatus } from '../../../../domain/vote/type/vote-status.type';

export class CreateVoteResult {
  private constructor(
    readonly id: string,
    readonly commissionId: string,
    readonly status: VoteStatus,
  ) {}

  static of(params: {
    readonly id: string;
    readonly commissionId: string;
    readonly status: VoteStatus;
  }): CreateVoteResult {
    return new CreateVoteResult(params.id, params.commissionId, params.status);
  }
}
