import { ElectorAggregate } from '../elector/elector.aggregate';
import { DomainError } from '../shared/domain-error';
import { createId } from '../shared/id';
import {
  ParticipationCanceled,
  ParticipationCast,
  ParticipationDomainEvent,
} from './participation.events';
import {
  ParticipationUnit,
  PrivacyMode,
  VoteWeightMode,
} from '../vote/type/vote-policy.type';
import { VotePolicy } from '../vote/vo/vote-policy.vo';
import { ElectorStatus } from '../elector/type/elector-status.type';
import { ParticipationStatus } from './type/participation-status.type';

interface CastParticipationParams {
  readonly id: string;
  readonly voteDetailId: string;
  readonly elector: ElectorAggregate;
  readonly selectedCandidateId: string | null;
  readonly effectivePolicy: VotePolicy;
  readonly participatedAt: Date;
}

interface ReconstituteParticipationParams {
  readonly id: string;
  readonly voteDetailId: string;
  readonly electorId: string;
  readonly candidateId: string | null;
  readonly groupKey: string | null;
  readonly voteWeight: number;
  readonly participatedAt: Date;
  readonly status: ParticipationStatus;
}

export class ParticipationAggregate {
  private readonly events: ParticipationDomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly voteDetailId: string,
    readonly electorId: string,
    readonly candidateId: string | null,
    readonly groupKey: string | null,
    readonly voteWeight: number,
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
      params.candidateId ? createId(params.candidateId) : null,
      params.groupKey,
      params.voteWeight,
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
    elector: ElectorAggregate,
  ): number {
    if (effectivePolicy.voteWeightMode === VoteWeightMode.Equal) {
      return 1;
    }

    return elector.voteWeight;
  }

  private static resolveCandidateId(
    effectivePolicy: VotePolicy,
    selectedCandidateId: string | null,
  ): string | null {
    if (effectivePolicy.privacyMode === PrivacyMode.Secret) {
      return null;
    }

    if (!selectedCandidateId) {
      throw new DomainError('public participation requires selected candidate');
    }

    return createId(selectedCandidateId);
  }
}
