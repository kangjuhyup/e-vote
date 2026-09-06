import type { ParticipationAccessBallotView } from '../../../query/dto/response/participation-access.view';

export const PARTICIPATION_ACCESS_READ_PORT = Symbol(
  'PARTICIPATION_ACCESS_READ_PORT',
);

export interface ParticipationAccessReadPort {
  findBallot(
    voteId: string,
    electorId: string,
  ): Promise<ParticipationAccessBallotView | undefined>;
}
