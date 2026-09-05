import { Inject, Injectable } from '@nestjs/common';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import { BillingOrderOutboxRecorder } from '../../event/billing-order-outbox.recorder';
import { BillingOrderNotFoundError } from '../../billing.error';
import {
  BILLING_ORDER_REPOSITORY_PORT,
  type BillingOrderRepositoryPort,
} from '../../port/persistence/command/billing-order-repository.port';
import { MarkBillingOrderRefundedCommand } from '../dto/request/mark-billing-order-refunded.command';
import { BillingOrderResult } from '../dto/response/billing-order-result.dto';

@Injectable()
export class MarkBillingOrderRefundedHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(BILLING_ORDER_REPOSITORY_PORT)
    private readonly repository: BillingOrderRepositoryPort,
    private readonly outboxRecorder: BillingOrderOutboxRecorder,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: MarkBillingOrderRefundedCommand,
  ): Promise<BillingOrderResult> {
    const order = await this.repository.findByIdForUpdate(
      command.billingOrderId,
    );
    if (!order) throw new BillingOrderNotFoundError();

    order.markRefunded(command.refundedAt);
    await this.repository.save(order);
    await this.outboxRecorder.record(order);

    return BillingOrderResult.of(order);
  }
}
