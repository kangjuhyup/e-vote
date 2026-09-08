type VoteStatusAction = 'cancel' | 'close';

export class ChangeVoteStatusCommand {
  private constructor(
    readonly voteId: string,
    readonly action: VoteStatusAction,
    readonly changedAt: Date,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly action: VoteStatusAction;
    readonly changedAt: Date;
  }): ChangeVoteStatusCommand {
    return new ChangeVoteStatusCommand(
      params.voteId,
      params.action,
      params.changedAt,
    );
  }
}
