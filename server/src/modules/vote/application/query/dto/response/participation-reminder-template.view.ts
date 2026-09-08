export class ParticipationReminderTemplateView {
  private constructor(
    readonly code: string,
    readonly content: string,
    readonly buttonLabel: string,
  ) {}

  static of(params: {
    readonly code: string;
    readonly content: string;
    readonly buttonLabel: string;
  }) {
    return new ParticipationReminderTemplateView(
      params.code,
      params.content,
      params.buttonLabel,
    );
  }
}
