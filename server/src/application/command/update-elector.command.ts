export class UpdateElectorCommand {
  private constructor(
    readonly voteId: string,
    readonly electorId: string,
    readonly identifier: string,
    readonly groupKey: string | undefined,
    readonly voteWeight: number,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly electorId: string;
    readonly identifier: string;
    readonly groupKey?: string;
    readonly voteWeight: number;
  }): UpdateElectorCommand {
    return new UpdateElectorCommand(
      params.voteId,
      params.electorId,
      params.identifier,
      params.groupKey,
      params.voteWeight,
    );
  }
}
