export class CreateElectoralRollCommand {
  private constructor(
    readonly userPrincipalId: string,
    readonly name: string,
    readonly createdAt: Date,
  ) {}

  static of(params: {
    readonly userPrincipalId: string;
    readonly name: string;
    readonly createdAt: Date;
  }): CreateElectoralRollCommand {
    return new CreateElectoralRollCommand(
      params.userPrincipalId,
      params.name,
      params.createdAt,
    );
  }
}
