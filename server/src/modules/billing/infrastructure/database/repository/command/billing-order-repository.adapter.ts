import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { BillingOrderRepositoryPort } from '../../../../application/port/persistence/command/billing-order-repository.port';
import type { BillingOrderAggregate } from '../../../../domain/billing-order.aggregate';
import {
  getDatabaseEntities,
  nextRepositoryId,
  saveEntity,
} from '../../../../../../platform/database/repository/database-repository.util';
import {
  BillingOrderMapper,
  type BillingOrderPersistence,
} from '../../mapper/billing-order.mapper';

@Injectable()
export class BillingOrderRepositoryAdapter implements BillingOrderRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async findById(orderId: string): Promise<BillingOrderAggregate | undefined> {
    return this.findOne({ id: orderId });
  }

  async findByVoteId(
    voteId: string,
  ): Promise<BillingOrderAggregate | undefined> {
    return this.findOne({ voteId });
  }

  async save(order: BillingOrderAggregate): Promise<void> {
    const { BillingOrderEntity } = await getDatabaseEntities();
    await saveEntity(
      this.em,
      BillingOrderEntity,
      order.id,
      {
        voteId: order.voteId,
        commissionId: order.commissionId,
        orderedByUserPrincipalId: order.orderedByUserPrincipalId,
        productCode: order.productCode,
        productName: order.productName,
        electorCount: order.electorCount,
        pricingUnitSize: order.pricingUnitSize,
        pricingUnitCount: order.pricingUnitCount,
        unitPrice: order.unitPrice,
        amount: order.price.amount,
        currency: order.price.currency,
        issuedAt: order.issuedAt,
      },
      {
        status: order.status,
        paymentId: order.paymentId ?? null,
        paidAt: order.paidAt ?? null,
        refundedAt: order.refundedAt ?? null,
        updatedAt: new Date(),
      },
    );
  }

  private async findOne(
    where: Record<string, unknown>,
  ): Promise<BillingOrderAggregate | undefined> {
    const { BillingOrderEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      BillingOrderEntity as any,
      where,
    )) as unknown as BillingOrderPersistence | null;

    return entity ? BillingOrderMapper.toDomain(entity) : undefined;
  }
}
