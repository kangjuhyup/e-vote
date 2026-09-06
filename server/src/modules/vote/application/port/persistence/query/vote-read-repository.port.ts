import type {
  VotePageView,
  VoteView,
} from '../../../query/dto/response/vote.view';

export const VOTE_READ_REPOSITORY_PORT = Symbol('VOTE_READ_REPOSITORY_PORT');

export type VotePageRequest = {
  readonly page: number;
  readonly pageSize: number;
  readonly userPrincipalId: string;
};

export type VoteDetailRequest = {
  readonly voteId: string;
  readonly userPrincipalId: string;
};

export interface VoteReadRepositoryPort {
  findDetailById(request: VoteDetailRequest): Promise<VoteView | undefined>;
  findPage(request: VotePageRequest): Promise<VotePageView>;
}
