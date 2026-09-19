import { voteFixtureDetails } from '@/features/votes/api/votes-fixtures';
import { voteApiFetch } from '@/shared/auth/vote-api-fetch';
import { isApiMockMode } from '@/shared/config/api-mode';
import { unwrapVoteApiResponse } from '@/features/votes/api/votes-api';
import type { AdminBillingOrderPage, AdminOperationsOverview } from '../model/admin-operations.types';

function mockOverview(): AdminOperationsOverview {
  const votes = voteFixtureDetails.map((vote) => ({
    id: vote.id,
    title: vote.title,
    organizationGroupId: 'mock-organization',
    status: ({ draft: 'DRAFT', finalized: 'FINALIZED', active: 'OPEN', completed: 'CLOSED', canceled: 'CANCELED' } as Record<string, string>)[vote.status] ?? vote.status.toUpperCase(),
    updatedAt: vote.startsAt,
  }));
  const voteCounts = votes.reduce<Record<string, number>>((counts, vote) => {
    counts[vote.status] = (counts[vote.status] ?? 0) + 1;
    return counts;
  }, {});
  return {
    organizations: [{ id: 'mock-organization', name: '샘플 조직', totalVotes: votes.length, voteCounts }],
    recentVotes: votes,
    recentOrders: [],
    totalVotes: votes.length,
    totalOrders: 0,
  };
}

export async function fetchAdminOperationsOverview(): Promise<AdminOperationsOverview> {
  if (isApiMockMode()) return mockOverview();
  const baseUrl = (process.env.NEXT_PUBLIC_VOTE_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('운영 현황에 연결할 수 없습니다.');
  const response = await voteApiFetch(`${baseUrl}/admin/operations/overview`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (response.status === 403) throw new Error('운영 현황을 볼 권한이 없습니다.');
  if (!response.ok) throw new Error('운영 현황을 불러오지 못했습니다.');
  return unwrapVoteApiResponse<AdminOperationsOverview>(await response.json());
}

export async function fetchAdminBillingOrders(input: {
  page: number;
  organizationId?: string;
  status?: string;
}): Promise<AdminBillingOrderPage> {
  if (isApiMockMode()) return { items: [], page: input.page, pageSize: 20, totalItems: 0, totalPages: 0 };
  const baseUrl = (process.env.NEXT_PUBLIC_VOTE_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');
  if (!baseUrl) throw new Error('결제 내역에 연결할 수 없습니다.');
  const query = new URLSearchParams({ page: String(input.page), pageSize: '20' });
  if (input.organizationId) query.set('organizationId', input.organizationId);
  if (input.status) query.set('status', input.status);
  const response = await voteApiFetch(`${baseUrl}/admin/operations/orders?${query}`, {
    headers: { Accept: 'application/json' }, cache: 'no-store',
  });
  if (response.status === 403) throw new Error('결제 내역을 볼 권한이 없습니다.');
  if (!response.ok) throw new Error('결제 내역을 불러오지 못했습니다.');
  return unwrapVoteApiResponse<AdminBillingOrderPage>(await response.json());
}
