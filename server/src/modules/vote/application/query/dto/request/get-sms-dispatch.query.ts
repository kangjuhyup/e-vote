export class GetSmsDispatchQuery {
  private constructor(
    readonly voteId: string,
    readonly smsDispatchId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly smsDispatchId: string;
  }): GetSmsDispatchQuery {
    return new GetSmsDispatchQuery(params.voteId, params.smsDispatchId);
  }
}
