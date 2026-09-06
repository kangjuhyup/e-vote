export class DispatchParticipationInvitationsCommand {
  private constructor(
    readonly voteId: string,
    readonly requestedByUserPrincipalId: string,
    readonly electorIds: readonly string[] | undefined,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly requestedByUserPrincipalId: string;
    readonly electorIds?: readonly string[];
  }): DispatchParticipationInvitationsCommand {
    return new DispatchParticipationInvitationsCommand(
      params.voteId,
      params.requestedByUserPrincipalId,
      params.electorIds ? [...new Set(params.electorIds)] : undefined,
    );
  }
}
