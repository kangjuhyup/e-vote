import type {
  ElectorReference,
  FieldVotingSessionReference,
} from '../../../shared/domain/voting/capability-reference';
import { FieldVotingSessionStatus } from '../../../shared/domain/voting/type/field-voting-session-status.type';
import { DomainError } from '../../../shared/domain/domain-error';
import { createId } from '../../../shared/domain/id';
import {
  ParticipationCanceled,
  ParticipationCast,
  ParticipationDomainEvent,
} from './participation.events';
import {
  ParticipationUnit,
  PrivacyMode,
  VoteWeightMode,
} from '../../../shared/domain/voting/type/vote-policy.type';
import { VotingChannel } from '../../../shared/domain/voting/type/voting-channel.type';
import { VotePolicy } from '../../../shared/domain/voting/vo/vote-policy.vo';
import { ElectorStatus } from '../../../shared/domain/voting/type/elector-status.type';
import { ParticipationStatus } from '../../../shared/domain/voting/type/participation-status.type';

interface CastParticipationParams {
  readonly id: string;
  readonly voteDetailId: string;
  readonly elector: ElectorReference;
  readonly selectedCandidateId?: string;
  readonly effectivePolicy: VotePolicy;
  readonly votingChannel: VotingChannel;
  readonly fieldVotingSession?: FieldVotingSessionReference;
  readonly participatedAt: Date;
}

interface ReconstituteParticipationParams {
  readonly id: string;
  readonly voteDetailId: string;
  readonly electorId: string;
  readonly candidateId?: string;
  readonly groupKey?: string;
  readonly voteWeight: number;
  readonly votingChannel: VotingChannel;
  readonly fieldVotingSessionId?: string;
  readonly participatedAt: Date;
  readonly status: ParticipationStatus;
}

export class ParticipationAggregate {
  private readonly events: ParticipationDomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly voteDetailId: string,
    readonly electorId: string,
    readonly candidateId: string | undefined,
    readonly groupKey: string | undefined,
    readonly voteWeight: number,
    readonly votingChannel: VotingChannel,
    readonly fieldVotingSessionId: string | undefined,
    readonly participatedAt: Date,
    public status: ParticipationStatus,
  ) {}

  static cast(params: CastParticipationParams): ParticipationAggregate {
    const id = createId(params.id);
    const voteDetailId = createId(params.voteDetailId);

    if (params.elector.status !== ElectorStatus.Eligible) {
      throw new DomainError('elector is not eligible');
    }

    if (
      params.effectivePolicy.participationUnit === ParticipationUnit.Group &&
      !params.elector.groupKey
    ) {
      throw new DomainError('group participation requires elector groupKey');
    }

    const candidateId = ParticipationAggregate.resolveCandidateId(
      params.effectivePolicy,
      params.selectedCandidateId,
    );
    const fieldVotingSessionId =
      ParticipationAggregate.resolveFieldVotingSessionId(
        params.votingChannel,
        params.fieldVotingSession,
      );
    const voteWeight = ParticipationAggregate.calculateAppliedVoteWeight(
      params.effectivePolicy,
      params.elector,
    );

    const participation = new ParticipationAggregate(
      id,
      voteDetailId,
      params.elector.id,
      candidateId,
      params.elector.groupKey,
      voteWeight,
      params.votingChannel,
      fieldVotingSessionId,
      params.participatedAt,
      ParticipationStatus.Cast,
    );
    participation.events.push(
      ParticipationCast.of({
        aggregateId: participation.id,
        occurredAt: params.participatedAt,
      }),
    );

    return participation;
  }

  static reconstitute(
    params: ReconstituteParticipationParams,
  ): ParticipationAggregate {
    return new ParticipationAggregate(
      createId(params.id),
      createId(params.voteDetailId),
      createId(params.electorId),
      params.candidateId ? createId(params.candidateId) : undefined,
      params.groupKey,
      params.voteWeight,
      params.votingChannel,
      params.fieldVotingSessionId
        ? createId(params.fieldVotingSessionId)
        : undefined,
      params.participatedAt,
      params.status,
    );
  }

  cancel(canceledAt: Date): void {
    if (this.status !== ParticipationStatus.Cast) {
      throw new DomainError('only cast participation can be canceled');
    }

    this.status = ParticipationStatus.Canceled;
    this.events.push(
      ParticipationCanceled.of({
        aggregateId: this.id,
        occurredAt: canceledAt,
      }),
    );
  }

  pullEvents(): ParticipationDomainEvent[] {
    const pulledEvents = [...this.events];
    this.events.length = 0;
    return pulledEvents;
  }

  static calculateAppliedVoteWeight(
    effectivePolicy: VotePolicy,
    elector: ElectorReference,
  ): number {
    if (effectivePolicy.voteWeightMode === VoteWeightMode.Equal) {
      return 1;
    }

    return elector.voteWeight;
  }

  private static resolveCandidateId(
    effectivePolicy: VotePolicy,
    selectedCandidateId: string | undefined,
  ): string | undefined {
    if (effectivePolicy.privacyMode === PrivacyMode.Secret) {
      return undefined;
    }

    if (!selectedCandidateId) {
      throw new DomainError('public participation requires selected candidate');
    }

    return createId(selectedCandidateId);
  }

  private static resolveFieldVotingSessionId(
    votingChannel: VotingChannel,
    fieldVotingSession: FieldVotingSessionReference | undefined,
  ): string | undefined {
    if (votingChannel === VotingChannel.Online) {
      if (fieldVotingSession) {
        throw new DomainError(
          'online participation must not use field voting session',
        );
      }

      return undefined;
    }

    if (!fieldVotingSession) {
      throw new DomainError(
        'field participation requires field voting session',
      );
    }

    if (fieldVotingSession.status !== FieldVotingSessionStatus.Open) {
      throw new DomainError('field voting session must be open');
    }

    if (fieldVotingSession.channel !== votingChannel) {
      throw new DomainError('field voting session channel mismatch');
    }

    return fieldVotingSession.id;
  }
}
