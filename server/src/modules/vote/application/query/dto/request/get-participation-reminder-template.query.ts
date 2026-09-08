export class GetParticipationReminderTemplateQuery {
  private constructor(readonly voteId: string) {}

  static of(params: { readonly voteId: string }) {
    return new GetParticipationReminderTemplateQuery(params.voteId);
  }
}
