import type {
  CandidatePageReadView,
  CandidateReadView,
} from '../../../query/view/candidate-read.view';

export const CANDIDATE_READ_REPOSITORY_PORT = Symbol(
  'CANDIDATE_READ_REPOSITORY_PORT',
);

export type CandidatePageRequest = {
  readonly voteId: string;
  readonly voteDetailId: string;
  readonly page: number;
  readonly pageSize: number;
};

export interface CandidateReadRepositoryPort {
  findDetailById(
    voteId: string,
    voteDetailId: string,
    candidateId: string,
  ): Promise<CandidateReadView | undefined>;
  findPage(request: CandidatePageRequest): Promise<CandidatePageReadView>;
}
