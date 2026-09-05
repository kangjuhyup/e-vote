import { Inject, Injectable } from '@nestjs/common';
import { CandidateAggregate } from '../../../domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../../../../shared/domain/voting/type/candidate-status.type';
import { CreateCandidateCommand } from '../dto/request/create-candidate.command';
import { CreateCandidateResult } from '../dto/response/create-candidate-result.dto';
import { CANDIDATE_REPOSITORY_PORT } from '../../port/persistence/command/candidate-repository.port';
import type { CandidateRepositoryPort } from '../../port/persistence/command/candidate-repository.port';
import {
  VOTE_REPOSITORY_PORT,
  type VoteRepositoryPort,
} from '../../port/persistence/command/vote-repository.port';
import {
  VOTE_DETAIL_REPOSITORY_PORT,
  type VoteDetailRepositoryPort,
} from '../../port/persistence/command/vote-detail-repository.port';
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
export class CreateCandidateHandler {
  readonly [DATABASE_TRANSACTION_MANAGER_PROPERTY]: DatabaseTransactionManager;

  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly voteRepository: VoteRepositoryPort,
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly voteDetailRepository: VoteDetailRepositoryPort,
    @Inject(CANDIDATE_REPOSITORY_PORT)
    private readonly candidateRepository: CandidateRepositoryPort,
    @Inject(VOTE_SETUP_LIFECYCLE_PORT)
    private readonly voteSetupLifecycle: VoteSetupLifecyclePort,
    @Inject(DATABASE_TRANSACTION_MANAGER)
    transactionManager: DatabaseTransactionManager,
  ) {
    this[DATABASE_TRANSACTION_MANAGER_PROPERTY] = transactionManager;
  }

  @Transactional({ isolationLevel: 'serializable' })
  async execute(
    command: CreateCandidateCommand,
  ): Promise<CreateCandidateResult> {
    await this.voteSetupLifecycle.lockVote(command.voteId);
    const [vote, voteDetail] = await Promise.all([
      this.voteRepository.findById(command.voteId),
      this.voteDetailRepository.findById(command.voteDetailId),
    ]);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (!voteDetail) throw new ManagedResourceNotFoundError('vote detail');
    if (!voteDetail.belongsToVote(vote.id)) {
      throw new ManagedResourceScopeMismatchError();
    }
    vote.assertChildResourcesMutable('created');
    voteDetail.assertChildResourcesMutable('created');

    const candidate = CandidateAggregate.create({
      id: this.candidateRepository.nextId(),
      voteDetailId: command.voteDetailId,
      candidateNo: command.candidateNo,
      name: command.name,
      status: CandidateStatus.Active,
    });

    await this.candidateRepository.save(candidate);

    return CreateCandidateResult.of({
      id: candidate.id,
      voteDetailId: candidate.voteDetailId,
      status: candidate.status,
    });
  }
}
