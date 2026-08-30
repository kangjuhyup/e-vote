import type {
  ParticipationUnit,
  VoteWeightMode,
} from '../../../../domain/vote/type/vote-policy.type';

type VoteTurnoutViewProps = {
  readonly voteId: string;
  readonly voteDetailId: string;
  readonly participationUnit: ParticipationUnit;
  readonly voteWeightMode: VoteWeightMode;
  readonly groupVoteWeightConsistent: boolean;
  readonly eligibleElectorCount: number;
  readonly eligibleVotingUnitCount: number;
  readonly participantCount: number;
  readonly participatedVotingUnitCount: number;
  readonly turnoutRate: number;
  readonly eligibleVoteWeight: number;
  readonly participatedVoteWeight: number;
  readonly weightedTurnoutRate: number;
};

export class VoteTurnoutView {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
    readonly participationUnit: ParticipationUnit,
    readonly voteWeightMode: VoteWeightMode,
    readonly groupVoteWeightConsistent: boolean,
    readonly eligibleElectorCount: number,
    readonly eligibleVotingUnitCount: number,
    readonly participantCount: number,
    readonly participatedVotingUnitCount: number,
    readonly turnoutRate: number,
    readonly eligibleVoteWeight: number,
    readonly participatedVoteWeight: number,
    readonly weightedTurnoutRate: number,
  ) {}

  static of(params: VoteTurnoutViewProps): VoteTurnoutView {
    return new VoteTurnoutView(
      params.voteId,
      params.voteDetailId,
      params.participationUnit,
      params.voteWeightMode,
      params.groupVoteWeightConsistent,
      params.eligibleElectorCount,
      params.eligibleVotingUnitCount,
      params.participantCount,
      params.participatedVotingUnitCount,
      params.turnoutRate,
      params.eligibleVoteWeight,
      params.participatedVoteWeight,
      params.weightedTurnoutRate,
    );
  }
}
