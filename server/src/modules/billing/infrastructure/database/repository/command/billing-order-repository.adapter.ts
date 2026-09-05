import { Injectable } from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/postgresql';
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
import type { VoteUsageEntitlementAccessPort } from '../../../../../../shared/application/port/capability/vote-billing.port';

@Injectable()
export class BillingOrderRepositoryAdapter
  implements BillingOrderRepositoryPort, VoteUsageEntitlementAccessPort
{
  constructor(private readonly em: EntityManager) {}

  nextId(): string {
    return nextRepositoryId();
  }

  async findById(orderId: string): Promise<BillingOrderAggregate | undefined> {
    return this.findOne({ id: orderId });
  }

  async findByIdForUpdate(
    orderId: string,
  ): Promise<BillingOrderAggregate | undefined> {
    return this.findOne({ id: orderId }, LockMode.PESSIMISTIC_WRITE);
  }

  async findByVoteId(
    voteId: string,
  ): Promise<BillingOrderAggregate | undefined> {
    return this.findOne({ voteId });
  }

  async findByVoteIdForUpdate(
    voteId: string,
  ): Promise<BillingOrderAggregate | undefined> {
    return this.findOne({ voteId }, LockMode.PESSIMISTIC_WRITE);
  }

  async save(order: BillingOrderAggregate): Promise<void> {
    const { BillingOrderEntity } = await getDatabaseEntities();
    await saveEntity(
      this.em,
      BillingOrderEntity,
      order.id,
      {
        version: order.version,
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
        cancellationWindowDays: order.cancellationWindowDays,
        cancelableUntil: order.cancelableUntil,
      },
      {
        version: order.version,
        status: order.status,
        paymentId: order.paymentId ?? null,
        paidAt: order.paidAt ?? null,
        canceledAt: order.canceledAt ?? null,
        cancellationReason: order.cancellationReason ?? null,
        refundRequestedAt: order.refundRequestedAt ?? null,
        refundedAt: order.refundedAt ?? null,
        updatedAt: new Date(),
      },
    );
  }

  async hasPaidOrder(voteId: string): Promise<boolean> {
    return (await this.findByVoteId(voteId))?.grantsVoteUsage() ?? false;
  }

  private async findOne(
    where: Record<string, unknown>,
    lockMode?: LockMode,
  ): Promise<BillingOrderAggregate | undefined> {
    const { BillingOrderEntity } = await getDatabaseEntities();
    const entity = (await this.em.findOne(
      BillingOrderEntity as any,
      where,
      lockMode ? { lockMode } : undefined,
    )) as unknown as BillingOrderPersistence | null;

    return entity ? BillingOrderMapper.toDomain(entity) : undefined;
  }
}
