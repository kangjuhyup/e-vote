import { normalizePageQuery } from '../../../../../../shared/application/query/page.query-util';

export class GetElectionCommissionPageQuery {
  private constructor(
    readonly page: number,
    readonly pageSize: number,
  ) {}

  static of(params: {
    readonly page?: number;
    readonly pageSize?: number;
  }): GetElectionCommissionPageQuery {
    const normalized = normalizePageQuery(params);

    return new GetElectionCommissionPageQuery(
      normalized.page,
      normalized.pageSize,
    );
  }
}
