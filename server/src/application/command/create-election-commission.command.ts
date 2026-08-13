export class CreateElectionCommissionCommand {
  private constructor(
    readonly name: string,
    readonly createdAt: Date,
  ) {}

  static of(params: {
    name: string;
    createdAt: Date;
  }): CreateElectionCommissionCommand {
    return new CreateElectionCommissionCommand(params.name, params.createdAt);
  }
}
