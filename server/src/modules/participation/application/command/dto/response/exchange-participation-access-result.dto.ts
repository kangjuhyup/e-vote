import type { ParticipantSessionScope } from '../../../../domain/access/elector-participant-session.aggregate';

export class ParticipationAuthenticationRequiredResult {
  readonly authenticationRequired = true;

  private constructor(
    readonly voteId: string,
    readonly electorId: string,
  ) {}

  static of(params: {
    readonly voteId: string;
    readonly electorId: string;
  }): ParticipationAuthenticationRequiredResult {
    return new ParticipationAuthenticationRequiredResult(
      params.voteId,
      params.electorId,
    );
  }
}

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
