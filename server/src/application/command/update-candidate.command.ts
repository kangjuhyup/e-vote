export class UpdateCandidateCommand {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
    readonly candidateId: string,
    readonly candidateNo: number,
    readonly name: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly voteDetailId: string;
    readonly candidateId: string;
    readonly candidateNo: number;
    readonly name: string;
  }): UpdateCandidateCommand {
    return new UpdateCandidateCommand(
      params.voteId,
      params.voteDetailId,
      params.candidateId,
      params.candidateNo,
      params.name,
    );
  }
}
