import { Inject, Injectable } from '@nestjs/common';
import {
  VOTE_SETUP_LIFECYCLE_PORT,
  type VoteSetupLifecyclePort,
} from '../../../../../shared/application/port/capability/vote-billing.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  BillingOrderNotFoundError,
  VoteBillingAccessDeniedError,
} from '../../billing.error';
import {
  BILLING_ORDER_REPOSITORY_PORT,
  type BillingOrderRepositoryPort,
} from '../../port/persistence/command/billing-order-repository.port';
import { CancelVoteUsageBillingOrderCommand } from '../dto/request/cancel-vote-usage-billing-order.command';
import { BillingOrderResult } from '../dto/response/billing-order-result.dto';
import { BillingOrderOutboxRecorder } from '../../event/billing-order-outbox.recorder';
import { BillingOrderStatus } from '../../../domain/type/billing-order-status.type';

@Injectable()
export class CancelVoteUsageBillingOrderHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(BILLING_ORDER_REPOSITORY_PORT)
    private readonly billingOrders: BillingOrderRepositoryPort,
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
    command: CancelVoteUsageBillingOrderCommand,
  ): Promise<BillingOrderResult> {
    const order = await this.billingOrders.findById(command.billingOrderId);
    if (!order) throw new BillingOrderNotFoundError();

    if (!order.isOrderedBy(command.userPrincipalId)) {
      throw new VoteBillingAccessDeniedError();
    }

    await this.voteSetupLifecycle.lockVote(order.voteId);
    const lockedOrder = await this.billingOrders.findByIdForUpdate(order.id);
    if (!lockedOrder) throw new BillingOrderNotFoundError();

    const wasTerminal =
      lockedOrder.status === BillingOrderStatus.Canceled ||
      lockedOrder.status === BillingOrderStatus.RefundPending ||
      lockedOrder.status === BillingOrderStatus.Refunded;
    if (!wasTerminal) {
      await this.voteSetupLifecycle.assertBillingCancellationAllowed({
        voteId: lockedOrder.voteId,
        billingOrderId: lockedOrder.id,
        canceledAt: command.canceledAt,
      });
    }
    if (lockedOrder.status === BillingOrderStatus.Paid) {
      lockedOrder.requestRefund({
        reason: command.reason,
        requestedAt: command.canceledAt,
      });
    } else {
      lockedOrder.requestCancellation({
        reason: command.reason,
        canceledAt: command.canceledAt,
      });
    }
    if (!wasTerminal && lockedOrder.status === BillingOrderStatus.Canceled) {
      await this.voteSetupLifecycle.releaseBilling({
        voteId: lockedOrder.voteId,
        billingOrderId: lockedOrder.id,
      });
    }
    await this.billingOrders.save(lockedOrder);
    await this.outboxRecorder.record(lockedOrder);

    return BillingOrderResult.of(lockedOrder);
  }
}
