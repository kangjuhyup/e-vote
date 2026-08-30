export class WithdrawCandidateCommand {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
    readonly candidateId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly voteDetailId: string;
    readonly candidateId: string;
  }): WithdrawCandidateCommand {
    return new WithdrawCandidateCommand(
      params.voteId,
      params.voteDetailId,
      params.candidateId,
    );
  }
}
