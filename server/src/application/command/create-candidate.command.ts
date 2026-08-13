export class CreateCandidateCommand {
  private constructor(
    readonly voteDetailId: string,
    readonly candidateNo: number,
    readonly name: string,
  ) {}

  static of(params: {
    voteDetailId: string;
    candidateNo: number;
    name: string;
  }): CreateCandidateCommand {
    return new CreateCandidateCommand(
      params.voteDetailId,
      params.candidateNo,
      params.name,
    );
  }
}
