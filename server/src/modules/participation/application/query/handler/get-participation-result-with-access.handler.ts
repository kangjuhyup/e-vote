import { Injectable } from '@nestjs/common';
import type { VoteResultView } from '../dto/response/vote-result.view';
import { GetVoteResultQuery } from '../dto/request/get-vote-result.query';
import { ParticipantSessionScope } from '../../../domain/access/elector-participant-session.aggregate';
import { ResolveParticipationAccessSessionHandler } from './resolve-participation-access-session.handler';
import { GetVoteResultHandler } from './get-vote-result.handler';

@Injectable()
export class GetParticipationResultWithAccessHandler {
  constructor(
    private readonly sessions: ResolveParticipationAccessSessionHandler,
    private readonly results: GetVoteResultHandler,
  ) {}

  async execute(params: {
    readonly sessionToken: string;
    readonly voteDetailId: string;
  }): Promise<VoteResultView> {
    const session = await this.sessions.execute({
      sessionToken: params.sessionToken,
      expectedScope: ParticipantSessionScope.ResultRead,
      requireCsrf: false,
    });
    return this.results.execute(
      GetVoteResultQuery.of({
        voteId: session.voteId,
        voteDetailId: params.voteDetailId,
      }),
    );
  }
}
