import { Inject, Injectable } from '@nestjs/common';
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
  ) {}

  async execute(query: GetBillingOrderQuery): Promise<BillingOrderView> {
    const order = await this.repository.findById(query.billingOrderId);
    if (!order) throw new BillingOrderNotFoundError();

    if (!order.isOrderedBy(query.userPrincipalId)) {
      throw new BillingOrderAccessDeniedError();
    }

    return order;
  }
}
