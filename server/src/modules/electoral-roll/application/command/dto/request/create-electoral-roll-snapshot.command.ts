export class CreateElectoralRollSnapshotCommand {
  private constructor(
    readonly electoralRollId: string,
    readonly createdAt: Date,
  ) {}

  static of(params: {
    readonly electoralRollId: string;
    readonly createdAt: Date;
  }): CreateElectoralRollSnapshotCommand {
    return new CreateElectoralRollSnapshotCommand(
      params.electoralRollId,
      params.createdAt,
    );
  }
}
