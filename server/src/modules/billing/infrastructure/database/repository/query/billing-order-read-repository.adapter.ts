import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { BillingOrderReadRepositoryPort } from '../../../../application/port/persistence/query/billing-order-read-repository.port';
import { BillingOrderView } from '../../../../application/query/dto/response/billing-order.view';
import { getDatabaseEntities } from '../../../../../../platform/database/repository/database-repository.util';
import type { BillingOrderPersistence } from '../../mapper/billing-order.mapper';

@Injectable()
export class BillingOrderReadRepositoryAdapter implements BillingOrderReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async findById(orderId: string): Promise<BillingOrderView | undefined> {
    const { BillingOrderEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(BillingOrderEntity as any, {
      id: orderId,
    })) as unknown as BillingOrderPersistence | null;

    return entity
      ? BillingOrderView.of({
          id: entity.id,
          voteId: entity.voteId,
          commissionId: entity.commissionId,
          orderedByUserPrincipalId: entity.orderedByUserPrincipalId,
          productCode: entity.productCode,
          productName: entity.productName,
          electorCount: Number(entity.electorCount),
          pricingUnitSize: Number(entity.pricingUnitSize),
          pricingUnitCount: Number(entity.pricingUnitCount),
          unitPrice: Number(entity.unitPrice),
          amount: Number(entity.amount),
          currency: entity.currency,
          status: entity.status,
          paymentId: entity.paymentId ?? undefined,
          issuedAt: entity.issuedAt,
          cancellationWindowDays: Number(entity.cancellationWindowDays),
          cancelableUntil: entity.cancelableUntil,
          paidAt: entity.paidAt ?? undefined,
          canceledAt: entity.canceledAt ?? undefined,
          cancellationReason: entity.cancellationReason ?? undefined,
          refundRequestedAt: entity.refundRequestedAt ?? undefined,
          refundedAt: entity.refundedAt ?? undefined,
        })
      : undefined;
  }
}
