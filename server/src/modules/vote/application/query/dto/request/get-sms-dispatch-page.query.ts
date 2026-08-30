import { normalizePageQuery } from '../../../../../../shared/application/query/page.query-util';

export class GetSmsDispatchPageQuery {
  private constructor(
    readonly voteId: string,
    readonly page: number,
    readonly pageSize: number,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly page?: number;
    readonly pageSize?: number;
  }): GetSmsDispatchPageQuery {
    const normalized = normalizePageQuery(params);
    return new GetSmsDispatchPageQuery(
      params.voteId,
      normalized.page,
      normalized.pageSize,
    );
  }
}
