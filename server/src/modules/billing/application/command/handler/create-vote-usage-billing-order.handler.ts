import { Inject, Injectable } from '@nestjs/common';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';
import {
  VOTE_ACCESS_PORT,
  type VoteAccessPort,
} from '../../../../../shared/application/port/capability/vote-access.port';
import {
  VOTE_ELECTOR_COUNT_ACCESS_PORT,
  type VoteElectorCountAccessPort,
} from '../../../../../shared/application/port/capability/vote-elector-count-access.port';
import {
  VOTE_RESULT_STORAGE_PRICING_ACCESS_PORT,
  type VoteResultStoragePricingAccessPort,
} from '../../../../../shared/application/port/capability/vote-result-storage-pricing-access.port';
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
export class CreateVoteUsageBillingOrderHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(BILLING_ORDER_REPOSITORY_PORT)
    private readonly billingOrderRepository: BillingOrderRepositoryPort,
    @Inject(VOTE_ACCESS_PORT)
    private readonly voteAccess: VoteAccessPort,
    @Inject(VOTE_ELECTOR_COUNT_ACCESS_PORT)
    private readonly electorCountAccess: VoteElectorCountAccessPort,
    @Inject(VOTE_RESULT_STORAGE_PRICING_ACCESS_PORT)
    private readonly resultStoragePricingAccess: VoteResultStoragePricingAccessPort,
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
    command: CreateVoteUsageBillingOrderCommand,
  ): Promise<BillingOrderResult> {
    await this.voteSetupLifecycle.lockVote(command.voteId);
    const vote = await this.voteAccess.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');

    const existing =
      await this.billingOrderRepository.findActiveByVoteIdForUpdate(vote.id);
    if (existing) {
      if (!existing.isOrderedBy(command.orderedByUserPrincipalId)) {
        throw new VoteBillingAccessDeniedError();
      }
      return BillingOrderResult.of(existing);
    }

    if (!vote.isCreatedBy(command.orderedByUserPrincipalId)) {
      throw new VoteBillingAccessDeniedError();
    }

    const billingOrderId = this.billingOrderRepository.nextId();
    await this.voteSetupLifecycle.lockForBilling({
      voteId: vote.id,
      billingOrderId,
    });
    const electorCount = await this.electorCountAccess.countEligibleElectors(
      vote.id,
    );
    const blockchainStorageCount =
      await this.resultStoragePricingAccess.countBlockchainVoteDetails(vote.id);
    const price = VoteUsagePrice.forElectorCount(
      electorCount,
      blockchainStorageCount,
      vote.identityVerificationPolicy.required,
    );
    const order = BillingOrderAggregate.issue({
      id: billingOrderId,
      voteId: vote.id,
      commissionId: vote.commissionId,
      orderedByUserPrincipalId: command.orderedByUserPrincipalId,
      price,
      issuedAt: command.issuedAt,
    });
    await this.billingOrderRepository.save(order);
    await this.outboxRecorder.record(order);

    return BillingOrderResult.of(order);
  }
}
