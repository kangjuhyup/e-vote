export class CreateElectoralRollSnapshotResult {
  private constructor(
    readonly id: string,
    readonly electoralRollId: string,
    readonly sourceRevision: number,
    readonly memberCount: number,
    readonly contentHash: string,
    readonly createdAt: Date,
  ) {}

  static of(params: {
    readonly id: string;
    readonly electoralRollId: string;
    readonly sourceRevision: number;
    readonly memberCount: number;
    readonly contentHash: string;
    readonly createdAt: Date;
  }): CreateElectoralRollSnapshotResult {
    return new CreateElectoralRollSnapshotResult(
      params.id,
      params.electoralRollId,
      params.sourceRevision,
      params.memberCount,
      params.contentHash,
      params.createdAt,
    );
  }
}
