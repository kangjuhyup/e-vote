import { Inject, Injectable } from '@nestjs/common';
import { IdentityVerificationPolicy } from '../../../../../shared/domain/voting/vo/identity-verification-policy.vo';
import { VotePolicy } from '../../../../../shared/domain/voting/vo/vote-policy.vo';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import { UpdateVoteCommand } from '../dto/request/update-vote.command';
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

@Injectable()
export class UpdateVoteHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly repository: VoteRepositoryPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(command: UpdateVoteCommand): Promise<ManageVoteResult> {
    await this.voteSetupLifecycle.lockVote(command.voteId);
    const vote = await this.repository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    vote.updateSettings({
      title: command.title,
      votingChannels: command.votingChannels,
      defaultPolicy: VotePolicy.of(command.defaultPolicy),
      identityVerificationPolicy: IdentityVerificationPolicy.of(
        command.identityVerificationPolicy,
      ),
      startedAt: command.startedAt,
      endedAt: command.endedAt,
    });
    await this.repository.save(vote);
    return ManageVoteResult.of({ id: vote.id, status: vote.status });
  }
}
