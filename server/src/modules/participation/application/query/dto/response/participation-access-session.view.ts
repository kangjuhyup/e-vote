import type { ParticipantSessionScope } from '../../../../domain/access/elector-participant-session.aggregate';

export class ParticipationAccessSessionView {
  private constructor(
    readonly sessionId: string,
    readonly invitationId: string,
    readonly voteId: string,
    readonly electorId: string,
    readonly scope: ParticipantSessionScope,
  ) {}

  static of(params: {
    readonly sessionId: string;
    readonly invitationId: string;
    readonly voteId: string;
    readonly electorId: string;
    readonly scope: ParticipantSessionScope;
  }): ParticipationAccessSessionView {
    return new ParticipationAccessSessionView(
      params.sessionId,
      params.invitationId,
      params.voteId,
      params.electorId,
      params.scope,
    );
  }
}
