export class GetVoteQuery {
  private constructor(
    readonly voteId: string,
    readonly userPrincipalId: string,
    readonly tenantId: string | undefined,
    readonly organizationGroupIds: readonly string[],
    readonly voteAdmin: boolean,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly userPrincipalId: string;
    readonly tenantId?: string;
    readonly organizationGroupIds?: readonly string[];
    readonly voteAdmin?: boolean;
  }): GetVoteQuery {
    return new GetVoteQuery(
      params.voteId,
      params.userPrincipalId,
      params.tenantId,
      params.organizationGroupIds ?? [],
      params.voteAdmin ?? false,
    );
  }
}
