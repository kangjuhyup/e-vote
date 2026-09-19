'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { RetryErrorCard } from '@/components/feedback/retry-error-card';
import { SkeletonCardGrid } from '@/components/feedback/skeleton-card-grid';
import { Button } from '@/components/ui/button';
import { adminBillingOrdersQueryOptions, adminOperationsQueryOptions } from '../api/admin-operations-query-options';
import { AdminNavigation } from '../ui/admin-navigation';
import { AdminPaymentsContent } from '../ui/admin-payments-content';

export function AdminPaymentsContainer({ account }: { account?: ReactNode }) {
  const [page, setPage] = useState(1);
  const [organizationId, setOrganizationId] = useState('all');
  const [status, setStatus] = useState('all');
  const organizations = useQuery(adminOperationsQueryOptions());
  const orders = useQuery(adminBillingOrdersQueryOptions({
    page,
    ...(organizationId !== 'all' ? { organizationId } : {}),
    ...(status !== 'all' ? { status } : {}),
  }));
  const error = orders.error ?? organizations.error;
  return <PageShell account={account} navigation={<AdminNavigation current="payments" />}
    eyebrow="서비스 운영" title="결제 관리" description="투표별 결제 상태, 처리 시각과 실패 사유를 확인합니다."
    actions={<Button type="button" variant="outline" disabled={orders.isFetching || organizations.isFetching} onClick={() => { void orders.refetch(); void organizations.refetch(); }}><RefreshCw aria-hidden="true" />새로고침</Button>}>
    {orders.isLoading || organizations.isLoading ? <SkeletonCardGrid count={2} label="결제 내역을 불러오는 중…" />
      : error ? <RetryErrorCard title="결제 내역을 불러오지 못했습니다." description={error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.'} onRetry={() => { void orders.refetch(); void organizations.refetch(); }} />
      : orders.data && organizations.data ? <AdminPaymentsContent page={orders.data} organizations={organizations.data.organizations}
        organizationId={organizationId} status={status}
        onOrganizationChange={(value) => { setOrganizationId(value); setPage(1); }}
        onStatusChange={(value) => { setStatus(value); setPage(1); }} onPageChange={setPage} /> : null}
  </PageShell>;
}
