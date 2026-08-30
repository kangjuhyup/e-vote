import { normalizePageQuery } from '../../page.query-util';

export class GetCandidatePageQuery {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
    readonly page: number,
    readonly pageSize: number,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly voteDetailId: string;
    readonly page?: number;
    readonly pageSize?: number;
  }): GetCandidatePageQuery {
    const normalized = normalizePageQuery(params);

    return new GetCandidatePageQuery(
      params.voteId,
      params.voteDetailId,
      normalized.page,
      normalized.pageSize,
    );
  }
}
