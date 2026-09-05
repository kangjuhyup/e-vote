import { Inject, Injectable } from '@nestjs/common';
import {
  CANDIDATE_REPOSITORY_PORT,
  type CandidateRepositoryPort,
} from '../../port/persistence/command/candidate-repository.port';
import {
  VOTE_DETAIL_REPOSITORY_PORT,
  type VoteDetailRepositoryPort,
} from '../../port/persistence/command/vote-detail-repository.port';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import { WithdrawCandidateCommand } from '../dto/request/withdraw-candidate.command';
import { ManageCandidateResult } from '../dto/response/manage-candidate-result.dto';
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
export class WithdrawCandidateHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_REPOSITORY_PORT) private readonly votes: VoteRepositoryPort,
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly details: VoteDetailRepositoryPort,
    @Inject(CANDIDATE_REPOSITORY_PORT)
    private readonly candidates: CandidateRepositoryPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: WithdrawCandidateCommand,
  ): Promise<ManageCandidateResult> {
    await this.voteSetupLifecycle.lockVote(command.voteId);
    const [vote, detail, candidate] = await Promise.all([
      this.votes.findById(command.voteId),
      this.details.findById(command.voteDetailId),
      this.candidates.findById(command.candidateId),
    ]);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (!detail) throw new ManagedResourceNotFoundError('vote detail');
    if (!candidate) throw new ManagedResourceNotFoundError('candidate');
    if (
      !detail.belongsToVote(vote.id) ||
      !candidate.belongsToVoteDetail(detail.id)
    )
      throw new ManagedResourceScopeMismatchError();
    vote.assertChildResourcesMutable('deleted');
    detail.assertChildResourcesMutable('deleted');
    candidate.withdraw();
    await this.candidates.save(candidate);
    return ManageCandidateResult.of({
      id: candidate.id,
      voteDetailId: candidate.voteDetailId,
      status: candidate.status,
    });
  }
}
