import { Inject, Injectable } from '@nestjs/common';
import { CandidateAggregate } from '../../../domain/candidate/candidate.aggregate';
import { CandidateStatus } from '../../../domain/candidate/type/candidate-status.type';
import { CreateCandidateCommand } from '../create-candidate.command';
import { CANDIDATE_REPOSITORY_PORT } from '../../port/persistence/command/candidate-repository.port';
import type { CandidateRepositoryPort } from '../../port/persistence/command/candidate-repository.port';

export type CreateCandidateResult = {
  id: string;
  voteDetailId: string;
  status: CandidateStatus;
};

@Injectable()
export class CreateCandidateHandler {
  constructor(
    @Inject(CANDIDATE_REPOSITORY_PORT)
    private readonly candidateRepository: CandidateRepositoryPort,
  ) {}

  async execute(
    command: CreateCandidateCommand,
  ): Promise<CreateCandidateResult> {
    const candidate = CandidateAggregate.create({
      id: this.candidateRepository.nextId(),
      voteDetailId: command.voteDetailId,
      candidateNo: command.candidateNo,
      name: command.name,
      status: CandidateStatus.Active,
    });

    await this.candidateRepository.save(candidate);

    return {
      id: candidate.id,
      voteDetailId: candidate.voteDetailId,
      status: candidate.status,
    };
  }
}
