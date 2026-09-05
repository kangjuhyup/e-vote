import { Inject, Injectable } from '@nestjs/common';
import { BillingOrderNotFoundError } from '../../billing.error';
import {
  BILLING_ORDER_REPOSITORY_PORT,
  type BillingOrderRepositoryPort,
} from '../../port/persistence/command/billing-order-repository.port';
import { MarkBillingOrderPaidCommand } from '../dto/request/mark-billing-order-paid.command';
import { BillingOrderResult } from '../dto/response/billing-order-result.dto';
import { BillingOrderOutboxRecorder } from '../../event/billing-order-outbox.recorder';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';

@Injectable()
export class MarkBillingOrderPaidHandler {
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
    command: MarkBillingOrderPaidCommand,
  ): Promise<BillingOrderResult> {
    const order = await this.repository.findByIdForUpdate(
      command.billingOrderId,
    );
    if (!order) throw new BillingOrderNotFoundError();

    order.markPaid({
      paymentId: command.paymentId,
      paidAmount: command.amount,
      paidCurrency: command.currency,
      paidAt: command.paidAt,
    });
    await this.repository.save(order);
    await this.outboxRecorder.record(order);

    return BillingOrderResult.of(order);
  }
}
