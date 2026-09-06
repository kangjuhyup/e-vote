import type { ParticipantSessionScope } from '../../../../domain/access/elector-participant-session.aggregate';

export class ExchangeParticipationAccessResult {
  private constructor(
    readonly sessionToken: string,
    readonly csrfToken: string,
    readonly scope: ParticipantSessionScope,
    readonly voteId: string,
    readonly sessionExpiresAt: Date,
  ) {}

  static of(params: {
    readonly sessionToken: string;
    readonly csrfToken: string;
    readonly scope: ParticipantSessionScope;
    readonly voteId: string;
    readonly sessionExpiresAt: Date;
  }): ExchangeParticipationAccessResult {
    return new ExchangeParticipationAccessResult(
      params.sessionToken,
      params.csrfToken,
      params.scope,
      params.voteId,
      params.sessionExpiresAt,
    );
  }
}
