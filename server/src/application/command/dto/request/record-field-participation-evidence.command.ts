export class RecordFieldParticipationEvidenceCommand {
  private constructor(
    readonly participationId: string,
    readonly fieldVotingSessionId: string,
    readonly verifiedByCommissionMemberId: string,
    readonly evidenceFileId: string | undefined,
    readonly verificationNote: string | undefined,
    readonly verifiedAt: Date,
  ) {}

  static of(params: {
    participationId: string;
    fieldVotingSessionId: string;
    verifiedByCommissionMemberId: string;
    evidenceFileId?: string;
    verificationNote?: string;
    verifiedAt: Date;
  }): RecordFieldParticipationEvidenceCommand {
    return new RecordFieldParticipationEvidenceCommand(
      params.participationId,
      params.fieldVotingSessionId,
      params.verifiedByCommissionMemberId,
      params.evidenceFileId,
      params.verificationNote,
      params.verifiedAt,
    );
  }
}
