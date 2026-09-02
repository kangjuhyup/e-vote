import { normalizePageQuery } from '../../../../../../shared/application/query/page.query-util';

export class GetElectoralRollPageQuery {
  readonly query?: string;

  private constructor(
    readonly userPrincipalId: string,
    query: string | undefined,
    readonly page: number,
    readonly pageSize: number,
  ) {
    if (query !== undefined) this.query = query;
  }

  static of(params: {
    readonly userPrincipalId: string;
    readonly query?: string;
    readonly page?: number;
    readonly pageSize?: number;
  }): GetElectoralRollPageQuery {
    const normalized = normalizePageQuery(params);

    return new GetElectoralRollPageQuery(
      params.userPrincipalId,
      normalizeOptionalText(params.query),
      normalized.page,
      normalized.pageSize,
    );
  }
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
