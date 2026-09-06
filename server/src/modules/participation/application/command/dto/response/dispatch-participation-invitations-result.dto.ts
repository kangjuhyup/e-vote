export class DispatchParticipationInvitationsResult {
  private constructor(
    readonly totalCount: number,
    readonly queuedCount: number,
    readonly skippedCount: number,
  ) {}

  static of(params: {
    readonly totalCount: number;
    readonly queuedCount: number;
    readonly skippedCount: number;
  }): DispatchParticipationInvitationsResult {
    return new DispatchParticipationInvitationsResult(
      params.totalCount,
      params.queuedCount,
      params.skippedCount,
    );
  }
}
