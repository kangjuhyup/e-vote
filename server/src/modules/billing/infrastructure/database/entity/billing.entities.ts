import type { DatabaseEntityFactoryContext } from '../../../../../platform/database/entity/entity-factory-context';
import type { BillingOrderStatus } from '../../../../../platform/database/entity/type/database-enum.type';

export function createBillingEntities(
  context: DatabaseEntityFactoryContext,
): Partial<
  import('../../../../../platform/database/entity/entity-factory-context').DatabaseEntityClasses
> {
  const { defineEntity, p } = context;

  const BillingOrderSchema = defineEntity({
    name: 'BillingOrderEntity',
    tableName: 'billing_orders',
    uniques: [
      { name: 'billing_orders_payment_unique', properties: ['paymentId'] },
    ],
    properties: {
      id: p.uuid().primary(),
      version: p.integer(),
      voteId: p.uuid().fieldName('vote_id'),
      commissionId: p.uuid().fieldName('commission_id'),
      orderedByUserPrincipalId: p
        .string()
        .fieldName('ordered_by_user_principal_id'),
      productCode: p.string().fieldName('product_code'),
      productName: p.string().fieldName('product_name'),
      electorCount: p.integer().fieldName('elector_count'),
      pricingUnitSize: p.integer().fieldName('pricing_unit_size'),
      pricingUnitCount: p.integer().fieldName('pricing_unit_count'),
      unitPrice: p.integer().fieldName('unit_price'),
      blockchainStorageCount: p.integer().fieldName('blockchain_storage_count'),
      blockchainStorageUnitPrice: p
        .integer()
        .fieldName('blockchain_storage_unit_price'),
      identityVerificationRequired: p
        .boolean()
        .fieldName('identity_verification_required'),
      identityVerificationUnitPrice: p
        .integer()
        .fieldName('identity_verification_unit_price'),
      amount: p.integer(),
      currency: p.string().length(3),
      status: p.string().$type<BillingOrderStatus>(),
      paymentId: p.string().fieldName('payment_id').nullable(),
      issuedAt: p.datetime().fieldName('issued_at'),
      cancellationWindowDays: p.integer().fieldName('cancellation_window_days'),
      cancelableUntil: p.datetime().fieldName('cancelable_until'),
      paidAt: p.datetime().fieldName('paid_at').nullable(),
      canceledAt: p.datetime().fieldName('canceled_at').nullable(),
      cancellationReason: p.text().fieldName('cancellation_reason').nullable(),
      refundRequestedAt: p
        .datetime()
        .fieldName('refund_requested_at')
        .nullable(),
      refundedAt: p.datetime().fieldName('refunded_at').nullable(),
      updatedAt: p.datetime().fieldName('updated_at'),
    },
  });
  class BillingOrderEntity extends BillingOrderSchema.class {}
  BillingOrderSchema.setClass(BillingOrderEntity);

  return { BillingOrderEntity };
}
