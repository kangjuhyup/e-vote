export class CreateCandidateCommand {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
    readonly candidateNo: number,
    readonly name: string,
  ) {}

  static of(params: {
    voteId: string;
    voteDetailId: string;
    candidateNo: number;
    name: string;
  }): CreateCandidateCommand {
    return new CreateCandidateCommand(
      params.voteId,
      params.voteDetailId,
      params.candidateNo,
      params.name,
    );
  }
}
