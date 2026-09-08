export class DevelopmentParticipationLinkView {
  private constructor(
    readonly electorId: string,
    readonly participationUrl: string,
  ) {}

  static of(params: {
    readonly electorId: string;
    readonly participationUrl: string;
  }): DevelopmentParticipationLinkView {
    return new DevelopmentParticipationLinkView(
      params.electorId,
      params.participationUrl,
    );
  }
}
