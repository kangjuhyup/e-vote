export class CastParticipationWithAccessCommand {
  private constructor(
    readonly sessionToken: string,
    readonly csrfToken: string,
    readonly voteDetailId: string,
    readonly selectedCandidateId: string,
  ) {}

  static of(params: {
    readonly sessionToken: string;
    readonly csrfToken: string;
    readonly voteDetailId: string;
    readonly selectedCandidateId: string;
  }): CastParticipationWithAccessCommand {
    return new CastParticipationWithAccessCommand(
      params.sessionToken,
      params.csrfToken,
      params.voteDetailId,
      params.selectedCandidateId,
    );
  }
}
