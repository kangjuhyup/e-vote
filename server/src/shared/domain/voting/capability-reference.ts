import type { CandidateStatus } from './type/candidate-status.type';
import type { ElectorStatus } from './type/elector-status.type';
import type { FieldVotingSessionStatus } from './type/field-voting-session-status.type';
import type { ParticipationStatus } from './type/participation-status.type';
import type { VoteDetailStatus, VoteStatus } from './type/vote-status.type';
import type { VotingChannel } from './type/voting-channel.type';
import type { VotePolicy } from './vo/vote-policy.vo';

export interface ElectionCommissionReference {
  readonly id: string;
  canRunVote(): boolean;
}

export interface ElectionCommissionMemberReference {
  readonly id: string;
  canManageFieldVoting(commissionId: string): boolean;
}

export interface VoteReference {
  readonly id: string;
  readonly createdByUserPrincipalId?: string;
  readonly commissionId: string;
  readonly status: VoteStatus;
  readonly electoralRollSnapshotId?: string;
  readonly billingOrderId?: string;
  readonly finalizedAt?: Date;
  readonly defaultPolicy: VotePolicy;
  readonly identityVerificationPolicy: { readonly required: boolean };
  allowsVotingChannel(channel: VotingChannel): boolean;
  isCreatedBy(userPrincipalId: string): boolean;
  hasElectoralRollSnapshot(): boolean;
  usesElectoralRollSnapshot(snapshotId: string): boolean;
  assertElectorsMutable(action: 'created' | 'updated' | 'deleted'): void;
  assertParticipationAllowed(channel: VotingChannel): void;
}

export interface VoteDetailReference {
  readonly id: string;
  readonly voteId: string;
  readonly status: VoteDetailStatus;
  belongsToVote(voteId: string): boolean;
  assertParticipationAllowed(): void;
  getEffectivePolicy(defaultPolicy: VotePolicy): VotePolicy;
}

export interface CandidateReference {
  readonly id: string;
  readonly voteDetailId: string;
  readonly status: CandidateStatus;
  belongsToVoteDetail(voteDetailId: string): boolean;
  isSelectableForVoteDetail(voteDetailId: string): boolean;
}

export interface ElectorReference {
  readonly id: string;
  readonly voteId: string;
  readonly status: ElectorStatus;
  readonly groupKey?: string;
  readonly voteWeight: number;
  isIdentityVerified(): boolean;
}

export interface FieldVotingSessionReference {
  readonly id: string;
  readonly commissionId: string;
  readonly voteId: string;
  readonly channel: VotingChannel;
  readonly status: FieldVotingSessionStatus;
  hasAssignedManager(memberId: string): boolean;
  belongsToVote(voteId: string): boolean;
}

export interface ParticipationReference {
  readonly id: string;
  readonly voteDetailId: string;
  readonly electorId: string;
  readonly groupKey?: string;
  readonly votingChannel: VotingChannel;
  readonly fieldVotingSessionId?: string;
  readonly status: ParticipationStatus;
}

export interface ElectoralRollSnapshotReference {
  readonly id: string;
  readonly memberCount: number;
  hasCompleteIdentityVerificationData(): boolean;
}
