export type VoteStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "completed"
  | "canceled";

export type VoteStatusFilter = "all" | VoteStatus;

export type ElectorParticipationFilter =
  | "all"
  | "participated"
  | "not-participated";

export interface VoteSummary {
  id: string;
  title: string;
  status: VoteStatus;
  startsAt: string;
  endsAt: string;
  electorCount: number;
  participatedCount: number;
}

export interface VoteCandidate {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface VoteElector {
  id: string;
  name: string;
  label: string;
  participated: boolean;
  participatedAt: string | null;
}

export interface VoteDetail extends VoteSummary {
  description: string;
  candidates: VoteCandidate[];
  electors: VoteElector[];
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
  activeVotes: VoteDetail[];
  upcomingVotes: VoteDetail[];
  attentionVotes: VoteDetail[];
  recentActivities: VoteActivity[];
  generatedAt: string;
}
