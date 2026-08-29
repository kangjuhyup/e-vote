import type {
  ElectorPageView,
  ElectorView,
} from '../../../query/view/elector.view';

export const ELECTOR_READ_REPOSITORY_PORT = Symbol(
  'ELECTOR_READ_REPOSITORY_PORT',
);

export type ElectorPageRequest = {
  readonly voteId: string;
  readonly page: number;
  readonly pageSize: number;
};

export interface ElectorReadRepositoryPort {
  findDetailById(
    voteId: string,
    electorId: string,
  ): Promise<ElectorView | undefined>;
  findPage(request: ElectorPageRequest): Promise<ElectorPageView>;
}
