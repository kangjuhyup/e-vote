export class CreateElectoralRollCommand {
  private constructor(
    readonly commissionId: string,
    readonly name: string,
    readonly createdAt: Date,
  ) {}

  static of(params: {
    readonly commissionId: string;
    readonly name: string;
    readonly createdAt: Date;
  }): CreateElectoralRollCommand {
    return new CreateElectoralRollCommand(
      params.commissionId,
      params.name,
      params.createdAt,
    );
  }
}
