import { Inject, Injectable, Optional } from '@nestjs/common';
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
  PARTICIPATION_ACCESS_REVOCATION_PORT,
  type ParticipationAccessRevocationPort,
} from '../../../../../shared/application/port/capability/participation-access-revocation.port';

@Injectable()
export class ChangeVoteStatusHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly repository: VoteRepositoryPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
    @Optional()
    @Inject(PARTICIPATION_ACCESS_REVOCATION_PORT)
    private readonly participationAccess?: ParticipationAccessRevocationPort,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(command: ChangeVoteStatusCommand): Promise<ManageVoteResult> {
    await this.voteSetupLifecycle.lockVote(command.voteId);
    const vote = await this.repository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (command.action === 'close') {
      vote.close(command.changedAt);
    } else {
      vote.cancel(command.changedAt);
      await this.participationAccess?.revokeAccessForVote(
        vote.id,
        command.changedAt,
      );
    }
    await this.repository.save(vote);
    return ManageVoteResult.of({ id: vote.id, status: vote.status });
  }
}
