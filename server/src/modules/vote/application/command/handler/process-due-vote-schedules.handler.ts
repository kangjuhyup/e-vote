import { Inject, Injectable } from '@nestjs/common';
import {
  VOTE_SCHEDULE_REPOSITORY_PORT,
  type VoteScheduleRepositoryPort,
} from '../../port/persistence/command/vote-schedule-repository.port';
import {
  UNPAID_VOTE_BILLING_EXPIRATION_PORT,
  type UnpaidVoteBillingExpirationPort,
  VOTE_USAGE_ENTITLEMENT_ACCESS_PORT,
  type VoteUsageEntitlementAccessPort,
} from '../../../../../shared/application/port/capability/vote-billing.port';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import { ProcessDueVoteSchedulesCommand } from '../dto/request/process-due-vote-schedules.command';
import { ProcessDueVoteSchedulesResult } from '../dto/response/process-due-vote-schedules-result.dto';
import {
  VOTE_DETAIL_REPOSITORY_PORT,
  type VoteDetailRepositoryPort,
} from '../../port/persistence/command/vote-detail-repository.port';
import { VoteDetailStatus } from '../../../../../shared/domain/voting/type/vote-status.type';

@Injectable()
export class ProcessDueVoteSchedulesHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_SCHEDULE_REPOSITORY_PORT)
    private readonly schedules: VoteScheduleRepositoryPort,
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly voteDetails: VoteDetailRepositoryPort,
    @Inject(VOTE_USAGE_ENTITLEMENT_ACCESS_PORT)
    private readonly entitlements: VoteUsageEntitlementAccessPort,
    @Inject(UNPAID_VOTE_BILLING_EXPIRATION_PORT)
    private readonly billingExpiration: UnpaidVoteBillingExpirationPort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'read-committed' })
  async execute(
    command: ProcessDueVoteSchedulesCommand,
  ): Promise<ProcessDueVoteSchedulesResult> {
    const expiring = await this.schedules.findDueForPaymentExpiration(
      command.now,
      command.batchSize,
    );
    const expiredVoteIds = await this.billingExpiration.expirePendingOrders({
      voteIds: expiring.map((vote) => vote.id),
      expiredAt: command.now,
    });
    let canceledCount = 0;
    for (const vote of expiring) {
      if (
        !expiredVoteIds.has(vote.id) ||
        !vote.cancelWhenPaymentOverdue(command.now)
      ) {
        continue;
      }
      await this.schedules.save(vote);
      canceledCount += 1;
    }
    await this.cancelVoteDetails([...expiredVoteIds]);

    const opening = await this.schedules.findDueForOpening(
      command.now,
      command.batchSize,
    );
    const paidVoteIds = await this.entitlements.findPaidVoteIds(
      opening.map((vote) => vote.id),
    );
    let openedCount = 0;

    for (const vote of opening) {
      if (!paidVoteIds.has(vote.id) || !vote.openWhenDue(command.now)) {
        continue;
      }
      await this.schedules.save(vote);
      openedCount += 1;
    }
    await this.openVoteDetails(
      opening.filter((vote) => vote.status === 'OPEN').map((vote) => vote.id),
      command.now,
    );

    const closing = await this.schedules.findDueForClosing(
      command.now,
      command.batchSize,
    );
    let closedCount = 0;
    for (const vote of closing) {
      if (!vote.closeWhenDue(command.now)) continue;
      await this.schedules.save(vote);
      closedCount += 1;
    }
    await this.closeVoteDetails(
      closing.filter((vote) => vote.status === 'CLOSED').map((vote) => vote.id),
      command.now,
    );

    return ProcessDueVoteSchedulesResult.of({
      openedCount,
      closedCount,
      canceledCount,
    });
  }

  private async cancelVoteDetails(voteIds: readonly string[]): Promise<void> {
    const details = await this.voteDetails.findByVoteIds(voteIds);
    for (const detail of details) {
      if (detail.status !== VoteDetailStatus.Draft) continue;
      detail.cancel();
      await this.voteDetails.save(detail);
    }
  }

  private async openVoteDetails(
    voteIds: readonly string[],
    openedAt: Date,
  ): Promise<void> {
    const details = await this.voteDetails.findByVoteIds(voteIds);
    for (const detail of details) {
      if (detail.status !== VoteDetailStatus.Draft) continue;
      detail.open(openedAt);
      await this.voteDetails.save(detail);
    }
  }

  private async closeVoteDetails(
    voteIds: readonly string[],
    closedAt: Date,
  ): Promise<void> {
    const details = await this.voteDetails.findByVoteIds(voteIds);
    for (const detail of details) {
      if (detail.status !== VoteDetailStatus.Open) continue;
      detail.close(closedAt);
      await this.voteDetails.save(detail);
    }
  }
}
