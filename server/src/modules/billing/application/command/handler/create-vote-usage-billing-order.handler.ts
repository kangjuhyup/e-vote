import { Inject, Injectable } from '@nestjs/common';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';
import {
  ELECTION_COMMISSION_MEMBERSHIP_ACCESS_PORT,
  type ElectionCommissionMembershipAccessPort,
} from '../../../../../shared/application/port/capability/election-commission-membership-access.port';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import {
  VOTE_ELECTOR_COUNT_ACCESS_PORT,
  type VoteElectorCountAccessPort,
} from '../../../../../shared/application/port/capability/vote-elector-count-access.port';
import {
  VOTE_SETUP_LIFECYCLE_PORT,
  type VoteSetupLifecyclePort,
} from '../../../../../shared/application/port/capability/vote-billing.port';
import { BillingOrderAggregate } from '../../../domain/billing-order.aggregate';
import { VoteUsagePrice } from '../../../domain/vo/vote-usage-price.vo';
import { VoteBillingAccessDeniedError } from '../../billing.error';
import {
  BILLING_ORDER_REPOSITORY_PORT,
  type BillingOrderRepositoryPort,
} from '../../port/persistence/command/billing-order-repository.port';
import { CreateVoteUsageBillingOrderCommand } from '../dto/request/create-vote-usage-billing-order.command';
import { BillingOrderResult } from '../dto/response/billing-order-result.dto';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';

@Injectable()
export class CreateVoteUsageBillingOrderHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(BILLING_ORDER_REPOSITORY_PORT)
    private readonly billingOrderRepository: BillingOrderRepositoryPort,
    @Inject(VOTE_ACCESS_PORT)
    private readonly voteAccess: VoteAccessPort,
    @Inject(ELECTION_COMMISSION_MEMBERSHIP_ACCESS_PORT)
    private readonly membershipAccess: ElectionCommissionMembershipAccessPort,
    @Inject(VOTE_ELECTOR_COUNT_ACCESS_PORT)
    private readonly electorCountAccess: VoteElectorCountAccessPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: CreateVoteUsageBillingOrderCommand,
  ): Promise<BillingOrderResult> {
    const vote = await this.voteAccess.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');

    const canManageBilling = await this.membershipAccess.isActiveMember(
      vote.commissionId,
      command.orderedByUserPrincipalId,
    );
    if (!canManageBilling) throw new VoteBillingAccessDeniedError();

    await this.voteSetupLifecycle.lockVote(vote.id);
    const existing = await this.billingOrderRepository.findByVoteIdForUpdate(
      vote.id,
    );
    if (existing) {
      await this.voteSetupLifecycle.finalizeForBilling({
        voteId: vote.id,
        billingOrderId: existing.id,
        finalizedAt: existing.issuedAt,
      });
      return BillingOrderResult.of(existing);
    }

    const billingOrderId = this.billingOrderRepository.nextId();
    await this.voteSetupLifecycle.finalizeForBilling({
      voteId: vote.id,
      billingOrderId,
      finalizedAt: command.issuedAt,
    });
    const electorCount = await this.electorCountAccess.countEligibleElectors(
      vote.id,
    );
    const price = VoteUsagePrice.forElectorCount(electorCount);
    const order = BillingOrderAggregate.issue({
      id: billingOrderId,
      voteId: vote.id,
      commissionId: vote.commissionId,
      orderedByUserPrincipalId: command.orderedByUserPrincipalId,
      price,
      issuedAt: command.issuedAt,
    });
    await this.billingOrderRepository.save(order);

    return BillingOrderResult.of(order);
  }
}
