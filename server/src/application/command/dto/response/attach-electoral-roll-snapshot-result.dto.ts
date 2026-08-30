export class AttachElectoralRollSnapshotResult {
  private constructor(
    readonly voteId: string,
    readonly snapshotId: string,
    readonly memberCount: number,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly snapshotId: string;
    readonly memberCount: number;
  }): AttachElectoralRollSnapshotResult {
    return new AttachElectoralRollSnapshotResult(
      params.voteId,
      params.snapshotId,
      params.memberCount,
    );
  }
}
