import { Inject, Injectable } from '@nestjs/common';
import { VoteDetailAggregate } from '../../../domain/vote/vote-detail.aggregate';
import { VoteDetailStatus } from '../../../../../shared/domain/voting/type/vote-status.type';
import { CreateVoteDetailCommand } from '../dto/request/create-vote-detail.command';
import { CreateVoteDetailResult } from '../dto/response/create-vote-detail-result.dto';
import { VOTE_DETAIL_REPOSITORY_PORT } from '../../port/persistence/command/vote-detail-repository.port';
import type { VoteDetailRepositoryPort } from '../../port/persistence/command/vote-detail-repository.port';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import { ManagedResourceNotFoundError } from '../../../../../shared/application/error/managed-resource.error';
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
export class CreateVoteDetailHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly voteRepository: VoteRepositoryPort,
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly voteDetailRepository: VoteDetailRepositoryPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: CreateVoteDetailCommand,
  ): Promise<CreateVoteDetailResult> {
    await this.voteSetupLifecycle.lockVote(command.voteId);
    const vote = await this.voteRepository.findById(command.voteId);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    vote.assertChildResourcesMutable('created');

    const voteDetail = VoteDetailAggregate.create({
      id: this.voteDetailRepository.nextId(),
      voteId: command.voteId,
      title: command.title,
      type: command.type,
      sortOrder: command.sortOrder,
      overrides: command.overrides,
      status: VoteDetailStatus.Draft,
    });

    await this.voteDetailRepository.save(voteDetail);

    return CreateVoteDetailResult.of({
      id: voteDetail.id,
      voteId: voteDetail.voteId,
      status: voteDetail.status,
    });
  }
}
