import { normalizePageQuery } from '../../../../../../shared/application/query/page.query-util';

export class GetVotePageQuery {
  private constructor(
    readonly page: number,
    readonly pageSize: number,
    readonly userPrincipalId: string,
    readonly tenantId: string | undefined,
    readonly organizationGroupIds: readonly string[],
    readonly voteAdmin: boolean,
  ) {}

  static of(params: {
    readonly page?: number;
    readonly pageSize?: number;
    readonly userPrincipalId: string;
    readonly tenantId?: string;
    readonly organizationGroupIds?: readonly string[];
    readonly voteAdmin?: boolean;
  }): GetVotePageQuery {
    const normalized = normalizePageQuery(params);

    return new GetVotePageQuery(
      normalized.page,
      normalized.pageSize,
      params.userPrincipalId,
      params.tenantId,
      params.organizationGroupIds ?? [],
      params.voteAdmin ?? false,
    );
  }
}
