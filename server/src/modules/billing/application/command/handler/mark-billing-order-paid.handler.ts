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
import {
  VOTE_SETUP_LIFECYCLE_PORT,
  type VoteSetupLifecyclePort,
} from '../../../../../shared/application/port/capability/vote-billing.port';
import { BillingOrderStatus } from '../../../domain/type/billing-order-status.type';

@Injectable()
export class MarkBillingOrderPaidHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(BILLING_ORDER_REPOSITORY_PORT)
    private readonly repository: BillingOrderRepositoryPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
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
    const existing = await this.repository.findById(command.billingOrderId);
    if (!existing) throw new BillingOrderNotFoundError();

    await this.voteSetupLifecycle.lockVote(existing.voteId);
    const order = await this.repository.findByIdForUpdate(existing.id);
    if (!order) throw new BillingOrderNotFoundError();

    const transitionedToPaid =
      order.status === BillingOrderStatus.PendingPayment;
    order.markPaid({
      paymentId: command.paymentId,
      paidAmount: command.amount,
      paidCurrency: command.currency,
      paidAt: command.paidAt,
    });
    if (transitionedToPaid) {
      await this.voteSetupLifecycle.finalizePaidBilling({
        voteId: order.voteId,
        billingOrderId: order.id,
        finalizedAt: order.paidAt!,
      });
    }
    await this.repository.save(order);
    await this.outboxRecorder.record(order);

    return BillingOrderResult.of(order);
  }
}
