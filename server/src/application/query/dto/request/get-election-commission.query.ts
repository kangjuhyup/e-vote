export class GetElectionCommissionQuery {
  private constructor(readonly commissionId: string) {}

  static of(params: {
    readonly commissionId: string;
  }): GetElectionCommissionQuery {
    return new GetElectionCommissionQuery(params.commissionId);
  }
}
