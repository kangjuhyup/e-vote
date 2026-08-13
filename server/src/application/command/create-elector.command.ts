export class CreateElectorCommand {
  private constructor(
    readonly voteId: string,
    readonly identifier: string,
    readonly groupKey: string | undefined,
    readonly voteWeight: number,
  ) {}

  static of(params: {
    voteId: string;
    identifier: string;
    groupKey?: string;
    voteWeight?: number;
  }): CreateElectorCommand {
    return new CreateElectorCommand(
      params.voteId,
      params.identifier,
      params.groupKey,
      params.voteWeight ?? 1,
    );
  }
}
