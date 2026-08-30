import { normalizePageQuery } from '../../../../../../shared/application/query/page.query-util';

export class GetFieldVotingSessionPageQuery {
  private constructor(
    readonly voteId: string,
    readonly page: number,
    readonly pageSize: number,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly page?: number;
    readonly pageSize?: number;
  }): GetFieldVotingSessionPageQuery {
    const normalized = normalizePageQuery(params);

    return new GetFieldVotingSessionPageQuery(
      params.voteId,
      normalized.page,
      normalized.pageSize,
    );
  }
}
