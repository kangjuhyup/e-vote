type VoteDetailStatusAction = 'cancel' | 'close' | 'open';

export class ChangeVoteDetailStatusCommand {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
    readonly action: VoteDetailStatusAction,
    readonly changedAt: Date,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly voteDetailId: string;
    readonly action: VoteDetailStatusAction;
    readonly changedAt: Date;
  }): ChangeVoteDetailStatusCommand {
    return new ChangeVoteDetailStatusCommand(
      params.voteId,
      params.voteDetailId,
      params.action,
      params.changedAt,
    );
  }
}
