export interface OrganizationVoteOverview {
  id: string;
  name: string;
  totalVotes: number;
  voteCounts: Record<string, number>;
}

export interface AdminVote {
  id: string;
  title: string;
  organizationGroupId: string | null;
  status: string;
  updatedAt: string;
}

export interface AdminBillingOrder {
  id: string;
  voteId: string;
  voteTitle: string;
  organizationGroupId: string | null;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string;
  statusChangedAt: string;
  paidAt: string | null;
  canceledAt: string | null;
  refundRequestedAt: string | null;
  refundedAt: string | null;
  cancellationReason: string | null;
  failureReason: string | null;
  failureMessage: string | null;
  failedAt: string | null;
}

export interface AdminOperationsOverview {
  organizations: OrganizationVoteOverview[];
  recentVotes: AdminVote[];
  recentOrders: AdminBillingOrder[];
  totalVotes: number;
  totalOrders: number;
}

export interface AdminBillingOrderPage {
  items: AdminBillingOrder[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
