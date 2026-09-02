import type {
  ElectoralRollPageView,
  ElectoralRollView,
} from '../../../query/dto/response/electoral-roll.view';

export const ELECTORAL_ROLL_READ_REPOSITORY_PORT = Symbol(
  'ELECTORAL_ROLL_READ_REPOSITORY_PORT',
);

export interface ElectoralRollPageRequest {
  readonly userPrincipalId: string;
  readonly query?: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface ElectoralRollReadRepositoryPort {
  findDetailById(
    electoralRollId: string,
    userPrincipalId: string,
  ): Promise<ElectoralRollView | undefined>;
  findPage(request: ElectoralRollPageRequest): Promise<ElectoralRollPageView>;
}
