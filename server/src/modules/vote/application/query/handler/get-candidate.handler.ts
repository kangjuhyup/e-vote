import { Inject, Injectable } from '@nestjs/common';
import { CANDIDATE_READ_REPOSITORY_PORT } from '../../port/persistence/query/candidate-read-repository.port';
import type { CandidateReadRepositoryPort } from '../../port/persistence/query/candidate-read-repository.port';
import { GetCandidateQuery } from '../dto/request/get-candidate.query';
import type { CandidateReadView } from '../dto/response/candidate-read.view';

export class CandidateNotFoundError extends Error {
  constructor() {
    super('candidate not found');
  }
}

@Injectable()
export class GetCandidateHandler {
  constructor(
    @Inject(CANDIDATE_READ_REPOSITORY_PORT)
    private readonly candidateReadRepository: CandidateReadRepositoryPort,
  ) {}

  async execute(query: GetCandidateQuery): Promise<CandidateReadView> {
    const candidate = await this.candidateReadRepository.findDetailById(
      query.voteId,
      query.voteDetailId,
      query.candidateId,
    );

    if (!candidate) {
      throw new CandidateNotFoundError();
    }

    return candidate;
  }
}
