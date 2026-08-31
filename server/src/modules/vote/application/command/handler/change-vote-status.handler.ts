import { Inject, Injectable } from '@nestjs/common';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import { ChangeVoteStatusCommand } from '../dto/request/change-vote-status.command';
import { ManageVoteResult } from '../dto/response/manage-vote-result.dto';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';
import {
  VOTE_SETUP_LIFECYCLE_PORT,
  type VoteSetupLifecyclePort,
  VOTE_USAGE_ENTITLEMENT_ACCESS_PORT,
  type VoteUsageEntitlementAccessPort,
} from '../../../../../shared/application/port/capability/vote-billing.port';
import { DomainError } from '../../../../../shared/domain/domain-error';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';

@Injectable()
export class ChangeVoteStatusHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly repository: VoteRepositoryPort,
    @Inject(VOTE_USAGE_ENTITLEMENT_ACCESS_PORT)
    private readonly entitlementAccess: VoteUsageEntitlementAccessPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(command: ChangeVoteStatusCommand): Promise<ManageVoteResult> {
    await this.voteSetupLifecycle.lockVote(command.voteId);
    const vote = await this.repository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (command.action === 'open') {
      if (!(await this.entitlementAccess.hasPaidOrder(vote.id))) {
        throw new DomainError(
          'a paid billing order is required to open a vote',
        );
      }
      vote.open(command.changedAt);
    } else if (command.action === 'close') vote.close(command.changedAt);
    else vote.cancel(command.changedAt);
    await this.repository.save(vote);
    return ManageVoteResult.of({ id: vote.id, status: vote.status });
  }
}
