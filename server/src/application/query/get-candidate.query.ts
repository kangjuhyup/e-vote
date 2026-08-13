export class GetCandidateQuery {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
    readonly candidateId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly voteDetailId: string;
    readonly candidateId: string;
  }): GetCandidateQuery {
    return new GetCandidateQuery(
      params.voteId,
      params.voteDetailId,
      params.candidateId,
    );
  }
}
