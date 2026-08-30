import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_COMMISSION_MEMBERSHIP_ACCESS_PORT,
  type ElectionCommissionMembershipAccessPort,
} from '../../../../../shared/application/port/capability/election-commission-membership-access.port';
import {
  BillingOrderAccessDeniedError,
  BillingOrderNotFoundError,
} from '../../billing.error';
import {
  BILLING_ORDER_READ_REPOSITORY_PORT,
  type BillingOrderReadRepositoryPort,
} from '../../port/persistence/query/billing-order-read-repository.port';
import { GetBillingOrderQuery } from '../dto/request/get-billing-order.query';
import type { BillingOrderView } from '../dto/response/billing-order.view';

@Injectable()
export class GetBillingOrderHandler {
  constructor(
    @Inject(BILLING_ORDER_READ_REPOSITORY_PORT)
    private readonly repository: BillingOrderReadRepositoryPort,
    @Inject(ELECTION_COMMISSION_MEMBERSHIP_ACCESS_PORT)
    private readonly membershipAccess: ElectionCommissionMembershipAccessPort,
  ) {}

  async execute(query: GetBillingOrderQuery): Promise<BillingOrderView> {
    const order = await this.repository.findById(query.billingOrderId);
    if (!order) throw new BillingOrderNotFoundError();

    const canRead = await this.membershipAccess.isActiveMember(
      order.commissionId,
      query.userPrincipalId,
    );
    if (!canRead) throw new BillingOrderAccessDeniedError();

    return order;
  }
}
