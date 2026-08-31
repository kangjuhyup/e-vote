import { Inject, Injectable } from '@nestjs/common';
import {
  ELECTION_COMMISSION_MEMBERSHIP_ACCESS_PORT,
  type ElectionCommissionMembershipAccessPort,
} from '../../../../../shared/application/port/capability/election-commission-membership-access.port';
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

@Injectable()
export class CancelVoteUsageBillingOrderHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(BILLING_ORDER_REPOSITORY_PORT)
    private readonly billingOrders: BillingOrderRepositoryPort,
    @Inject(ELECTION_COMMISSION_MEMBERSHIP_ACCESS_PORT)
    private readonly membershipAccess: ElectionCommissionMembershipAccessPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
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

    const canCancel = await this.membershipAccess.isActiveMember(
      order.commissionId,
      command.userPrincipalId,
    );
    if (!canCancel) throw new VoteBillingAccessDeniedError();

    await this.voteSetupLifecycle.lockVote(order.voteId);
    const lockedOrder = await this.billingOrders.findByIdForUpdate(order.id);
    if (!lockedOrder) throw new BillingOrderNotFoundError();

    lockedOrder.requestCancellation({
      reason: command.reason,
      canceledAt: command.canceledAt,
    });
    await this.voteSetupLifecycle.cancelFinalizedVote({
      voteId: lockedOrder.voteId,
      canceledAt: command.canceledAt,
    });
    await this.billingOrders.save(lockedOrder);

    return BillingOrderResult.of(lockedOrder);
  }
}
