import type {
  VotePageView,
  VoteView,
} from '../../../query/dto/response/vote.view';

export const VOTE_READ_REPOSITORY_PORT = Symbol('VOTE_READ_REPOSITORY_PORT');

export type VotePageRequest = {
  readonly page: number;
  readonly pageSize: number;
};

export interface VoteReadRepositoryPort {
  findDetailById(voteId: string): Promise<VoteView | undefined>;
  findPage(request: VotePageRequest): Promise<VotePageView>;
}
