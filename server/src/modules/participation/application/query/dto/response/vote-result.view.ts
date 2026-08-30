import type { CandidateStatus } from '../../../../../../shared/domain/voting/type/candidate-status.type';
import type {
  ParticipationUnit,
  PrivacyMode,
  VoteWeightMode,
} from '../../../../../../shared/domain/voting/type/vote-policy.type';
import type { VotingChannel } from '../../../../../../shared/domain/voting/type/voting-channel.type';
import type {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../../../shared/domain/voting/type/vote-status.type';

type CandidateVoteResultViewProps = {
  readonly candidateId: string;
  readonly candidateNo: number;
  readonly name: string;
  readonly status: CandidateStatus;
  readonly voteCount: number;
  readonly voteRate: number;
  readonly weightedVoteCount: number;
  readonly weightedVoteRate: number;
};

export class CandidateVoteResultView {
  private constructor(
    readonly candidateId: string,
    readonly candidateNo: number,
    readonly name: string,
    readonly status: CandidateStatus,
    readonly voteCount: number,
    readonly voteRate: number,
    readonly weightedVoteCount: number,
    readonly weightedVoteRate: number,
  ) {}

  static of(params: CandidateVoteResultViewProps): CandidateVoteResultView {
    return new CandidateVoteResultView(
      params.candidateId,
      params.candidateNo,
      params.name,
      params.status,
      params.voteCount,
      params.voteRate,
      params.weightedVoteCount,
      params.weightedVoteRate,
    );
  }
}

type VotingChannelResultViewProps = {
  readonly channel: VotingChannel;
  readonly participantCount: number;
  readonly participationRate: number;
  readonly participatedVoteWeight: number;
  readonly weightedParticipationRate: number;
};

export class VotingChannelResultView {
  private constructor(
    readonly channel: VotingChannel,
    readonly participantCount: number,
    readonly participationRate: number,
    readonly participatedVoteWeight: number,
    readonly weightedParticipationRate: number,
  ) {}

  static of(params: VotingChannelResultViewProps): VotingChannelResultView {
    return new VotingChannelResultView(
      params.channel,
      params.participantCount,
      params.participationRate,
      params.participatedVoteWeight,
      params.weightedParticipationRate,
    );
  }
}

type VoteResultViewProps = {
  readonly voteId: string;
  readonly voteDetailId: string;
  readonly voteStatus: VoteStatus;
  readonly voteDetailStatus: VoteDetailStatus;
  readonly privacyMode: PrivacyMode;
  readonly participationUnit: ParticipationUnit;
  readonly voteWeightMode: VoteWeightMode;
  readonly participantCount: number;
  readonly participatedVoteWeight: number;
  readonly totalVoteCount: number;
  readonly totalWeightedVoteCount: number;
  readonly candidates: readonly CandidateVoteResultView[];
  readonly votingChannels: readonly VotingChannelResultView[];
};

export class VoteResultView {
  private constructor(
    readonly voteId: string,
    readonly voteDetailId: string,
    readonly voteStatus: VoteStatus,
    readonly voteDetailStatus: VoteDetailStatus,
    readonly privacyMode: PrivacyMode,
    readonly participationUnit: ParticipationUnit,
    readonly voteWeightMode: VoteWeightMode,
    readonly participantCount: number,
    readonly participatedVoteWeight: number,
    readonly totalVoteCount: number,
    readonly totalWeightedVoteCount: number,
    readonly candidates: readonly CandidateVoteResultView[],
    readonly votingChannels: readonly VotingChannelResultView[],
  ) {}

  static of(params: VoteResultViewProps): VoteResultView {
    return new VoteResultView(
      params.voteId,
      params.voteDetailId,
      params.voteStatus,
      params.voteDetailStatus,
      params.privacyMode,
      params.participationUnit,
      params.voteWeightMode,
      params.participantCount,
      params.participatedVoteWeight,
      params.totalVoteCount,
      params.totalWeightedVoteCount,
      params.candidates,
      params.votingChannels,
    );
  }
}
