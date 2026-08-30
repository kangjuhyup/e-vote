import { normalizePageQuery } from '../../page.query-util';

export class GetVotePageQuery {
  private constructor(
    readonly page: number,
    readonly pageSize: number,
  ) {}

  static of(params: {
    readonly page?: number;
    readonly pageSize?: number;
  }): GetVotePageQuery {
    const normalized = normalizePageQuery(params);

    return new GetVotePageQuery(normalized.page, normalized.pageSize);
  }
}
