export interface AdminOrganizationVoteView {
  id: string;
  name: string;
  voteCounts: Record<string, number>;
  totalVotes: number;
}

export interface AdminVoteView {
  id: string;
  title: string;
  organizationGroupId: string | undefined;
  status: string;
  updatedAt: Date;
}

export interface AdminBillingOrderView {
  id: string;
  voteId: string;
  voteTitle: string;
  organizationGroupId: string | undefined;
  amount: number;
  currency: string;
  status: string;
  issuedAt: Date;
  statusChangedAt: Date;
  paidAt: Date | undefined;
  canceledAt: Date | undefined;
  refundRequestedAt: Date | undefined;
  refundedAt: Date | undefined;
  cancellationReason: string | undefined;
  failureReason: string | undefined;
  failureMessage: string | undefined;
  failedAt: Date | undefined;
}

export interface AdminOperationsView {
  organizations: AdminOrganizationVoteView[];
  recentVotes: AdminVoteView[];
  recentOrders: AdminBillingOrderView[];
  totalVotes: number;
  totalOrders: number;
}

export interface AdminBillingOrderPageView {
  items: AdminBillingOrderView[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
