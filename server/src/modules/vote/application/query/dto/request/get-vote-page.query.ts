import { normalizePageQuery } from '../../../../../../shared/application/query/page.query-util';

export class GetVotePageQuery {
  private constructor(
    readonly page: number,
    readonly pageSize: number,
    readonly userPrincipalId: string,
  ) {}

  static of(params: {
    readonly page?: number;
    readonly pageSize?: number;
    readonly userPrincipalId: string;
  }): GetVotePageQuery {
    const normalized = normalizePageQuery(params);

    return new GetVotePageQuery(
      normalized.page,
      normalized.pageSize,
      params.userPrincipalId,
    );
  }
}
