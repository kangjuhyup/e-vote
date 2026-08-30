import { normalizePageQuery } from '../../page.query-util';

export class GetVoteDetailPageQuery {
  private constructor(
    readonly voteId: string,
    readonly page: number,
    readonly pageSize: number,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly page?: number;
    readonly pageSize?: number;
  }): GetVoteDetailPageQuery {
    const normalized = normalizePageQuery(params);

    return new GetVoteDetailPageQuery(
      params.voteId,
      normalized.page,
      normalized.pageSize,
    );
  }
}
