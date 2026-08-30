export class GetBillingOrderQuery {
  private constructor(
    readonly billingOrderId: string,
    readonly userPrincipalId: string,
  ) {}

  static of(params: {
    readonly billingOrderId: string;
    readonly userPrincipalId: string;
  }): GetBillingOrderQuery {
    return new GetBillingOrderQuery(
      params.billingOrderId,
      params.userPrincipalId,
    );
  }
}
