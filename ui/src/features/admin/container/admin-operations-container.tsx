'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { PageShell } from '@/components/layout/page-shell';
import { RetryErrorCard } from '@/components/feedback/retry-error-card';
import { SkeletonCardGrid } from '@/components/feedback/skeleton-card-grid';
import { Button } from '@/components/ui/button';
import { adminOperationsQueryOptions } from '../api/admin-operations-query-options';
import { AdminNavigation } from '../ui/admin-navigation';
import { AdminOperationsContent } from '../ui/admin-operations-content';

export function AdminOperationsContainer({ account }: { account?: ReactNode }) {
  const [organizationId, setOrganizationId] = useState('all');
  const query = useQuery(adminOperationsQueryOptions());
  return (
    <PageShell account={account} navigation={<AdminNavigation current="overview" />}
      eyebrow="서비스 운영" title="운영 현황"
      description="조직별 투표 진행 상태와 결제 주문을 확인합니다."
      actions={<Button type="button" variant="outline" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw aria-hidden="true" className={query.isFetching ? 'motion-safe:animate-spin' : ''} />새로고침</Button>}>
      {query.isLoading ? <SkeletonCardGrid count={3} label="운영 현황을 불러오는 중…" />
        : query.isError ? <RetryErrorCard title="운영 현황을 불러오지 못했습니다." description={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'} onRetry={() => query.refetch()} />
        : query.data ? <AdminOperationsContent overview={query.data} organizationId={organizationId} onOrganizationChange={setOrganizationId} /> : null}
    </PageShell>
  );
}
