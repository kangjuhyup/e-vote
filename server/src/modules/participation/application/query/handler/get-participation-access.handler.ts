import { Inject, Injectable } from '@nestjs/common';
import { VoteStatus } from '../../../../../shared/domain/voting/type/vote-status.type';
import { ParticipantSessionScope } from '../../../domain/access/elector-participant-session.aggregate';
import {
  PARTICIPATION_ACCESS_READ_PORT,
  type ParticipationAccessReadPort,
} from '../../port/persistence/query/participation-access-read.port';
import {
  PARTICIPATION_ACCESS_TOKEN_PORT,
  type ParticipationAccessTokenPort,
} from '../../port/security/participation-access-token.port';
import { ParticipationAccessView } from '../dto/response/participation-access.view';
import { ParticipationAccessSessionInvalidError } from '../participation-access-session.error';
import { ResolveParticipationAccessSessionHandler } from './resolve-participation-access-session.handler';

@Injectable()
export class GetParticipationAccessHandler {
  constructor(
    private readonly resolveSession: ResolveParticipationAccessSessionHandler,
    @Inject(PARTICIPATION_ACCESS_READ_PORT)
    private readonly reads: ParticipationAccessReadPort,
    @Inject(PARTICIPATION_ACCESS_TOKEN_PORT)
    private readonly tokens: ParticipationAccessTokenPort,
  ) {}

  async execute(sessionToken: string): Promise<ParticipationAccessView> {
    const session = await this.resolveSession.execute({
      sessionToken,
      requireCsrf: false,
    });
    const ballot = await this.reads.findBallot(
      session.voteId,
      session.electorId,
    );
    if (!ballot) throw new ParticipationAccessSessionInvalidError();
    const participate =
      session.scope === ParticipantSessionScope.Participate &&
      ballot.vote.status === VoteStatus.Open;
    return ParticipationAccessView.of({
      ...ballot,
      scope: session.scope,
      csrfToken: this.tokens.deriveCsrfToken(sessionToken),
      permittedActions: {
        uploadSignature:
          session.scope === ParticipantSessionScope.Participate &&
          (ballot.vote.status === VoteStatus.Finalized || participate),
        participate,
        readResults: session.scope === ParticipantSessionScope.ResultRead,
      },
    });
  }
}
