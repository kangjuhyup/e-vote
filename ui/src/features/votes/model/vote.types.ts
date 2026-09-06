export type VoteStatus =
  | "draft"
  | "scheduled"
  | "finalized"
  | "active"
  | "completed"
  | "canceled";

export type VoteStatusFilter = "all" | VoteStatus;

export type ActiveVoteBillingOrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "REFUND_PENDING";

export type ElectorParticipationFilter =
  | "all"
  | "participated"
  | "not-participated";

export interface VoteSummary {
  activeBillingOrderId?: string;
  billingOrderStatus?: ActiveVoteBillingOrderStatus;
  commissionId?: string;
  electoralRollSnapshotId?: string;
  id: string;
  title: string;
  status: VoteStatus;
  startsAt: string;
  endsAt: string;
  electorCount: number;
  participatedCount: number;
  participationKnown: boolean;
}

export interface VoteCandidate {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface VoteSubVote {
  candidates: VoteCandidate[];
  description: string;
  id: string;
  order: number;
  status: VoteStatus;
  title: string;
  type: "candidate" | "yes-no";
}

export interface VoteElector {
  id: string;
  name: string;
  label: string;
  participated: boolean;
  participatedAt: string | null;
  participationKnown: boolean;
}

export interface VoteDetail extends VoteSummary {
  description: string;
  defaultPolicy?: {
    participationUnit: "INDIVIDUAL" | "GROUP";
    privacyMode: "SECRET" | "PUBLIC";
    resultStorageMode: "DATABASE" | "BLOCKCHAIN";
    voteWeightMode: "EQUAL" | "SHARE";
  };
  identityVerificationPolicy?: {
    method?: string;
    provider?: string;
    required: boolean;
  };
  candidates: VoteCandidate[];
  electors: VoteElector[];
  subVotes: VoteSubVote[];
  votingChannels?: Array<"ONLINE" | "ONSITE" | "VISIT">;
}

export interface VoteDashboardMetrics {
  activeVotes: number;
  scheduledVotes: number;
  completedVotes: number;
  averageParticipationRate: string;
}

export interface VoteActivity {
  id: string;
  title: string;
  detail: string;
  status: "stable" | "attention" | "pending";
}

export interface VoteDashboard {
  metrics: VoteDashboardMetrics;
  activeVotes: VoteSummary[];
  upcomingVotes: VoteSummary[];
  attentionVotes: VoteSummary[];
  recentActivities: VoteActivity[];
  generatedAt: string;
}
