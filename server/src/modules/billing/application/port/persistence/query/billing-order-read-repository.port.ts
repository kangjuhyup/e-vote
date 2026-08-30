import type { BillingOrderView } from '../../../query/dto/response/billing-order.view';

export const BILLING_ORDER_READ_REPOSITORY_PORT = Symbol(
  'BILLING_ORDER_READ_REPOSITORY_PORT',
);

export interface BillingOrderReadRepositoryPort {
  findById(orderId: string): Promise<BillingOrderView | undefined>;
}
