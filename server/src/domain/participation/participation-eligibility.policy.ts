import { ElectorAggregate } from '../elector/elector.aggregate';
import { DomainError } from '../shared/domain-error';
import { ParticipationUnit } from '../vote/type/vote-policy.type';
import { VotePolicy } from '../vote/vo/vote-policy.vo';
import { ElectorStatus } from '../elector/type/elector-status.type';
import { ParticipationAggregate } from './participation.aggregate';
import { ParticipationStatus } from './type/participation-status.type';

interface AssertCanParticipateParams {
  readonly voteDetailId: string;
  readonly elector: ElectorAggregate;
  readonly effectivePolicy: VotePolicy;
  readonly existingParticipations: readonly ParticipationAggregate[];
  readonly identityVerificationRequired?: boolean;
}

export class ParticipationEligibilityPolicy {
  assertCanParticipate(params: AssertCanParticipateParams): void {
    if (params.elector.status !== ElectorStatus.Eligible) {
      throw new DomainError('elector is not eligible');
    }

    if (
      params.identityVerificationRequired === true &&
      !params.elector.isIdentityVerified()
    ) {
      throw new DomainError('elector identity verification is required');
    }

    if (params.effectivePolicy.participationUnit === ParticipationUnit.Group) {
      this.assertGroupParticipation(params);
      return;
    }

    this.assertIndividualParticipation(params);
  }

  private assertGroupParticipation(params: AssertCanParticipateParams): void {
    if (!params.elector.groupKey) {
      throw new DomainError('group participation requires elector groupKey');
    }

    const hasDuplicate = params.existingParticipations.some(
      (participation) =>
        participation.status === ParticipationStatus.Cast &&
        participation.voteDetailId === params.voteDetailId &&
        participation.groupKey === params.elector.groupKey,
    );

    if (hasDuplicate) {
      throw new DomainError('group has already participated');
    }
  }

  private assertIndividualParticipation(
    params: AssertCanParticipateParams,
  ): void {
    const hasDuplicate = params.existingParticipations.some(
      (participation) =>
        participation.status === ParticipationStatus.Cast &&
        participation.voteDetailId === params.voteDetailId &&
        participation.electorId === params.elector.id,
    );

    if (hasDuplicate) {
      throw new DomainError('elector has already participated');
    }
  }
}
