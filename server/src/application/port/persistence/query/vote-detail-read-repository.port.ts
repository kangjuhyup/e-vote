import type {
  VoteDetailPageReadView,
  VoteDetailReadView,
} from '../../../query/view/vote-detail-read.view';

export const VOTE_DETAIL_READ_REPOSITORY_PORT = Symbol(
  'VOTE_DETAIL_READ_REPOSITORY_PORT',
);

export type VoteDetailPageRequest = {
  readonly voteId: string;
  readonly page: number;
  readonly pageSize: number;
};

export interface VoteDetailReadRepositoryPort {
  findDetailById(
    voteId: string,
    voteDetailId: string,
  ): Promise<VoteDetailReadView | undefined>;
  findPage(request: VoteDetailPageRequest): Promise<VoteDetailPageReadView>;
}
