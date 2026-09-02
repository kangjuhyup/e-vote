export class AttachElectoralRollSnapshotCommand {
  private constructor(
    readonly userPrincipalId: string,
    readonly voteId: string,
    readonly electoralRollId: string,
    readonly requestedAt: Date,
  ) {}

  static of(params: {
    readonly userPrincipalId: string;
    readonly voteId: string;
    readonly electoralRollId: string;
    readonly requestedAt: Date;
  }): AttachElectoralRollSnapshotCommand {
    return new AttachElectoralRollSnapshotCommand(
      params.userPrincipalId,
      params.voteId,
      params.electoralRollId,
      params.requestedAt,
    );
  }
}
