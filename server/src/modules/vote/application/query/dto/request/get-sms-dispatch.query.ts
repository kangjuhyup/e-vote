import { normalizePageQuery } from '../../../../../../shared/application/query/page.query-util';

export class GetSmsDispatchQuery {
  private constructor(
    readonly voteId: string,
    readonly smsDispatchId: string,
    readonly page: number,
    readonly pageSize: number,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly smsDispatchId: string;
    readonly page?: number;
    readonly pageSize?: number;
  }): GetSmsDispatchQuery {
    const normalized = normalizePageQuery(params);
    return new GetSmsDispatchQuery(
      params.voteId,
      params.smsDispatchId,
      normalized.page,
      normalized.pageSize,
    );
  }
}
