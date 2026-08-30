import { normalizePageQuery } from '../../../../../../shared/application/query/page.query-util';

export class GetElectoralRollPageQuery {
  readonly commissionId?: string;
  readonly query?: string;

  private constructor(
    readonly userPrincipalId: string,
    commissionId: string | undefined,
    query: string | undefined,
    readonly page: number,
    readonly pageSize: number,
  ) {
    if (commissionId !== undefined) this.commissionId = commissionId;
    if (query !== undefined) this.query = query;
  }

  static of(params: {
    readonly userPrincipalId: string;
    readonly commissionId?: string;
    readonly query?: string;
    readonly page?: number;
    readonly pageSize?: number;
  }): GetElectoralRollPageQuery {
    const normalized = normalizePageQuery(params);

    return new GetElectoralRollPageQuery(
      params.userPrincipalId,
      normalizeOptionalText(params.commissionId),
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
