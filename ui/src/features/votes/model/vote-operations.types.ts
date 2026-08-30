export type VoteDetailType = "CANDIDATE" | "YES_NO";
export type VoteLifecycleStatus = "DRAFT" | "OPEN" | "CLOSED" | "CANCELED";
export type VotingChannel = "ONLINE" | "ONSITE" | "VISIT";
export type PrivacyMode = "SECRET" | "PUBLIC";
export type ParticipationUnit = "INDIVIDUAL" | "GROUP";
export type ResultStorageMode = "DATABASE" | "BLOCKCHAIN";
export type VoteWeightMode = "EQUAL" | "SHARE";

export interface VotePolicyRecord {
  privacyMode: PrivacyMode;
  participationUnit: ParticipationUnit;
  resultStorageMode: ResultStorageMode;
  voteWeightMode: VoteWeightMode;
}

export interface OperationCandidate {
  id: string;
  candidateNo: number;
  description: string;
  name: string;
  status: "ACTIVE" | "WITHDRAWN";
}

export interface VoteTurnoutRecord {
  eligibleElectorCount: number;
  eligibleVoteWeight: number;
  eligibleVotingUnitCount: number;
  participatedVoteWeight: number;
  participatedVotingUnitCount: number;
  participantCount: number;
  participationUnit: ParticipationUnit;
  turnoutRate: number;
  voteWeightMode: VoteWeightMode;
  weightedTurnoutRate: number;
}

export interface CandidateResultRecord extends OperationCandidate {
  voteCount: number;
  voteRate: number;
  weightedVoteCount: number;
  weightedVoteRate: number;
}

export interface ChannelResultRecord {
  channel: VotingChannel;
  participantCount: number;
  participationRate: number;
  participatedVoteWeight: number;
  weightedParticipationRate: number;
}

export interface VoteResultRecord {
  candidates: CandidateResultRecord[];
  participantCount: number;
  participatedVoteWeight: number;
  participationUnit: ParticipationUnit;
  privacyMode: PrivacyMode;
  totalVoteCount: number;
  totalWeightedVoteCount: number;
  voteWeightMode: VoteWeightMode;
  votingChannels: ChannelResultRecord[];
}

export interface SubVoteOperations {
  candidates: OperationCandidate[];
  description: string;
  id: string;
  policy: VotePolicyRecord;
  result: VoteResultRecord | null;
  sortOrder: number;
  status: VoteLifecycleStatus;
  title: string;
  turnout: VoteTurnoutRecord | null;
  type: VoteDetailType;
  voteId: string;
}

export interface ElectorRecord {
  birthDate?: string;
  groupKey?: string;
  id: string;
  identifier: string;
  identityVerified: boolean;
  name: string;
  phoneNumber?: string;
  status: "ELIGIBLE" | "BLOCKED";
  voteId: string;
  voteWeight: number;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CommissionMemberRecord {
  id: string;
  name: string;
  role: "ADMIN" | "FIELD_MANAGER";
  status: "ACTIVE" | "INACTIVE";
}

export interface CommissionRecord {
  id: string;
  members: CommissionMemberRecord[];
  name: string;
  status: "ACTIVE" | "SUSPENDED";
}

export type FieldSessionStatus =
  | "SCHEDULED"
  | "OPEN"
  | "CLOSED"
  | "CANCELED";

export interface FieldSessionRecord {
  address: string;
  channel: "ONSITE" | "VISIT";
  commissionId: string;
  endsAt: string;
  id: string;
  locationName: string;
  managerIds: string[];
  startsAt: string;
  status: FieldSessionStatus;
  title: string;
  voteId: string;
}

export interface ReadCollection<T> {
  items: T[];
  readAvailable: boolean;
}

export interface CreateVoteInput {
  commissionId: string;
  defaultPolicy: VotePolicyRecord;
  identityVerificationPolicy: {
    method?: string;
    provider?: string;
    required: boolean;
  };
  title: string;
  votingChannels: VotingChannel[];
}

export interface CreateVoteResult {
  commissionId: string;
  id: string;
  status: VoteLifecycleStatus;
}

export interface CreateSubVoteInput {
  overrides?: Partial<VotePolicyRecord>;
  sortOrder?: number;
  title: string;
  type: VoteDetailType;
  voteId: string;
}

export interface CreateCandidateInput {
  candidateNo: number;
  name: string;
  voteDetailId: string;
  voteId: string;
}

export interface CreateElectorInput {
  birthDate?: string;
  groupKey?: string;
  identifier: string;
  name: string;
  phoneNumber?: string;
  voteId: string;
  voteWeight?: number;
}

export interface CreateFieldSessionInput {
  address: string;
  channel: "ONSITE" | "VISIT";
  commissionId: string;
  endsAt: string;
  locationName: string;
  managerIds: string[];
  startsAt: string;
  title: string;
  voteId: string;
}
