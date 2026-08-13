import { ElectionCommissionMemberAggregate } from '../election-commission/election-commission-member.aggregate';
import { ParticipationAggregate } from '../participation/participation.aggregate';
import { DomainError } from '../shared/domain-error';
import { createId } from '../shared/id';
import { VotingChannel } from '../vote/type/voting-channel.type';
import {
  FieldParticipationEvidenceRecorded,
  FieldVotingDomainEvent,
} from './field-voting.events';
import { FieldVotingSessionAggregate } from './field-voting-session.aggregate';

interface RecordFieldParticipationEvidenceParams {
  readonly id: string;
  readonly participation: ParticipationAggregate;
  readonly fieldVotingSession: FieldVotingSessionAggregate;
  readonly verifiedBy: ElectionCommissionMemberAggregate;
  readonly evidenceFileId?: string;
  readonly verificationNote?: string;
  readonly verifiedAt: Date;
}

interface ReconstituteFieldParticipationEvidenceParams {
  readonly id: string;
  readonly participationId: string;
  readonly fieldVotingSessionId: string;
  readonly verifiedByCommissionMemberId: string;
  readonly evidenceFileId?: string;
  readonly verificationNote?: string;
  readonly verifiedAt: Date;
}

export class FieldParticipationEvidenceAggregate {
  private readonly events: FieldVotingDomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly participationId: string,
    readonly fieldVotingSessionId: string,
    readonly verifiedByCommissionMemberId: string,
    readonly evidenceFileId: string | undefined,
    readonly verificationNote: string | undefined,
    readonly verifiedAt: Date,
  ) {}

  static record(
    params: RecordFieldParticipationEvidenceParams,
  ): FieldParticipationEvidenceAggregate {
    FieldParticipationEvidenceAggregate.assertRecordable(params);

    const evidence = new FieldParticipationEvidenceAggregate(
      createId(params.id),
      params.participation.id,
      params.fieldVotingSession.id,
      params.verifiedBy.id,
      params.evidenceFileId ? createId(params.evidenceFileId) : undefined,
      params.verificationNote?.trim() || undefined,
      params.verifiedAt,
    );
    evidence.events.push(
      FieldParticipationEvidenceRecorded.of({
        aggregateId: evidence.id,
        occurredAt: params.verifiedAt,
      }),
    );

    return evidence;
  }

  static reconstitute(
    params: ReconstituteFieldParticipationEvidenceParams,
  ): FieldParticipationEvidenceAggregate {
    return new FieldParticipationEvidenceAggregate(
      createId(params.id),
      createId(params.participationId),
      createId(params.fieldVotingSessionId),
      createId(params.verifiedByCommissionMemberId),
      params.evidenceFileId ? createId(params.evidenceFileId) : undefined,
      params.verificationNote?.trim() || undefined,
      params.verifiedAt,
    );
  }

  pullEvents(): FieldVotingDomainEvent[] {
    const pulledEvents = [...this.events];
    this.events.length = 0;
    return pulledEvents;
  }

  private static assertRecordable(
    params: RecordFieldParticipationEvidenceParams,
  ): void {
    if (params.participation.votingChannel === VotingChannel.Online) {
      throw new DomainError('field evidence requires field participation');
    }

    if (
      params.participation.fieldVotingSessionId !== params.fieldVotingSession.id
    ) {
      throw new DomainError('field evidence session mismatch');
    }

    if (
      !params.fieldVotingSession.hasAssignedManager(params.verifiedBy.id) ||
      !params.verifiedBy.canManageFieldVoting(
        params.fieldVotingSession.commissionId,
      )
    ) {
      throw new DomainError('field evidence verifier must be assigned manager');
    }
  }
}
