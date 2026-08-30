import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../domain/shared/domain-error';
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
} from '../vote-management.error';

@Injectable()
export class WithdrawCandidateHandler {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT) private readonly votes: VoteRepositoryPort,
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly details: VoteDetailRepositoryPort,
    @Inject(CANDIDATE_REPOSITORY_PORT)
    private readonly candidates: CandidateRepositoryPort,
  ) {}

  async execute(
    command: WithdrawCandidateCommand,
  ): Promise<ManageCandidateResult> {
    const [vote, detail, candidate] = await Promise.all([
      this.votes.findById(command.voteId),
      this.details.findById(command.voteDetailId),
      this.candidates.findById(command.candidateId),
    ]);
    if (!vote) throw new ManagedResourceNotFoundError('vote');
    if (!detail) throw new ManagedResourceNotFoundError('vote detail');
    if (!candidate) throw new ManagedResourceNotFoundError('candidate');
    if (detail.voteId !== vote.id || candidate.voteDetailId !== detail.id)
      throw new ManagedResourceScopeMismatchError();
    if (vote.status !== 'DRAFT' || detail.status !== 'DRAFT')
      throw new DomainError('only draft vote resources can be deleted');
    candidate.withdraw();
    await this.candidates.save(candidate);
    return ManageCandidateResult.of({
      id: candidate.id,
      voteDetailId: candidate.voteDetailId,
      status: candidate.status,
    });
  }
}
