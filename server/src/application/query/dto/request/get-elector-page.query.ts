import { normalizePageQuery } from '../../page.query-util';

export class GetElectorPageQuery {
  private constructor(
    readonly voteId: string,
    readonly page: number,
    readonly pageSize: number,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly page?: number;
    readonly pageSize?: number;
  }): GetElectorPageQuery {
    const normalized = normalizePageQuery(params);

    return new GetElectorPageQuery(
      params.voteId,
      normalized.page,
      normalized.pageSize,
    );
  }
}
