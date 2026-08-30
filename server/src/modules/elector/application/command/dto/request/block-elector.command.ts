export class BlockElectorCommand {
  private constructor(
    readonly voteId: string,
    readonly electorId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly electorId: string;
  }): BlockElectorCommand {
    return new BlockElectorCommand(params.voteId, params.electorId);
  }
}
