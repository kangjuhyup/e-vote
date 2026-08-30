export class AttachElectoralRollSnapshotCommand {
  private constructor(
    readonly voteId: string,
    readonly snapshotId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly snapshotId: string;
  }): AttachElectoralRollSnapshotCommand {
    return new AttachElectoralRollSnapshotCommand(
      params.voteId,
      params.snapshotId,
    );
  }
}
