import { Inject, Injectable } from '@nestjs/common';
import { CANDIDATE_READ_REPOSITORY_PORT } from '../../port/persistence/query/candidate-read-repository.port';
import type { CandidateReadRepositoryPort } from '../../port/persistence/query/candidate-read-repository.port';
import { GetCandidatePageQuery } from '../get-candidate-page.query';
import type { CandidatePageReadView } from '../view/candidate-read.view';

@Injectable()
export class GetCandidatePageHandler {
  constructor(
    @Inject(CANDIDATE_READ_REPOSITORY_PORT)
    private readonly candidateReadRepository: CandidateReadRepositoryPort,
  ) {}

  execute(query: GetCandidatePageQuery): Promise<CandidatePageReadView> {
    return this.candidateReadRepository.findPage({
      voteId: query.voteId,
      voteDetailId: query.voteDetailId,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
