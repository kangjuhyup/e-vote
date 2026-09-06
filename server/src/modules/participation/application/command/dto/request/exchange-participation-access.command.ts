export class ExchangeParticipationAccessCommand {
  private constructor(
    readonly token: string,
    readonly currentSessionToken: string | undefined,
  ) {}

  static of(params: {
    readonly token: string;
    readonly currentSessionToken?: string;
  }): ExchangeParticipationAccessCommand {
    return new ExchangeParticipationAccessCommand(
      params.token,
      params.currentSessionToken,
    );
  }
}
