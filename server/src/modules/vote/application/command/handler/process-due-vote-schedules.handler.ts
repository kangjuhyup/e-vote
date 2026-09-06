import { Inject, Injectable } from '@nestjs/common';
import {
  VOTE_SCHEDULE_REPOSITORY_PORT,
  type VoteScheduleRepositoryPort,
} from '../../port/persistence/command/vote-schedule-repository.port';
import {
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

@Injectable()
export class ProcessDueVoteSchedulesHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_SCHEDULE_REPOSITORY_PORT)
    private readonly schedules: VoteScheduleRepositoryPort,
    @Inject(VOTE_USAGE_ENTITLEMENT_ACCESS_PORT)
    private readonly entitlements: VoteUsageEntitlementAccessPort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'read-committed' })
  async execute(
    command: ProcessDueVoteSchedulesCommand,
  ): Promise<ProcessDueVoteSchedulesResult> {
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

    return ProcessDueVoteSchedulesResult.of({ openedCount, closedCount });
  }
}
