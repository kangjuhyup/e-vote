export class RecordFieldParticipationEvidenceResult {
  private constructor(
    readonly id: string,
    readonly participationId: string,
  ) {}

  static of(params: {
    readonly id: string;
    readonly participationId: string;
  }): RecordFieldParticipationEvidenceResult {
    return new RecordFieldParticipationEvidenceResult(
      params.id,
      params.participationId,
    );
  }
}
