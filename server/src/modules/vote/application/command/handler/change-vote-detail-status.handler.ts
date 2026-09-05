import { Inject, Injectable } from '@nestjs/common';
import {
  VOTE_DETAIL_REPOSITORY_PORT,
  type VoteDetailRepositoryPort,
} from '../../port/persistence/command/vote-detail-repository.port';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import { ChangeVoteDetailStatusCommand } from '../dto/request/change-vote-detail-status.command';
import { ManageVoteDetailResult } from '../dto/response/manage-vote-detail-result.dto';
import {
  ManagedResourceNotFoundError,
  ManagedResourceScopeMismatchError,
} from '../../../../../shared/application/error/managed-resource.error';
import {
  VOTE_SETUP_LIFECYCLE_PORT,
  type VoteSetupLifecyclePort,
} from '../../../../../shared/application/port/capability/vote-billing.port';
import {
  DATABASE_TRANSACTION_MANAGER,
  type DatabaseTransactionManager,
} from '../../../../../shared/application/port/persistence/transaction/database-transaction-manager.port';
import {
  DATABASE_TRANSACTION_MANAGER_PROPERTY,
  Transactional,
} from '../../../../../shared/application/persistence/transaction/transactional.decorator';

@Injectable()
export class ChangeVoteDetailStatusHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_REPOSITORY_PORT) private readonly votes: VoteRepositoryPort,
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly details: VoteDetailRepositoryPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: ChangeVoteDetailStatusCommand,
  ): Promise<ManageVoteDetailResult> {
    await this.voteSetupLifecycle.lockVote(command.voteId);
    const [vote, detail] = await Promise.all([
      this.votes.findById(command.voteId),
      this.details.findById(command.voteDetailId),
    ]);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (!detail) throw new ManagedResourceNotFoundError('vote detail');
    if (!detail.belongsToVote(vote.id))
      throw new ManagedResourceScopeMismatchError();
    if (command.action === 'open') {
      vote.assertVoteDetailOpeningAllowed();
      detail.open(command.changedAt);
    } else if (command.action === 'close') {
      detail.close(command.changedAt);
    } else {
      vote.assertChildResourcesMutable('canceled');
      detail.cancel();
    }
    await this.details.save(detail);
    return ManageVoteDetailResult.of({
      id: detail.id,
      voteId: detail.voteId,
      status: detail.status,
    });
  }
}
