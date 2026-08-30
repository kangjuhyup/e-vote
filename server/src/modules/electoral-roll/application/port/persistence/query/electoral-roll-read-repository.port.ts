import type { ElectoralRollView } from '../../../query/dto/response/electoral-roll.view';

export const ELECTORAL_ROLL_READ_REPOSITORY_PORT = Symbol(
  'ELECTORAL_ROLL_READ_REPOSITORY_PORT',
);

export interface ElectoralRollReadRepositoryPort {
  findDetailById(
    electoralRollId: string,
  ): Promise<ElectoralRollView | undefined>;
}
