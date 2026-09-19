'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { RetryErrorCard } from '@/components/feedback/retry-error-card';
import { SkeletonCardGrid } from '@/components/feedback/skeleton-card-grid';
import { PageShell } from '@/components/layout/page-shell';
import { AdminNavigation } from '@/features/admin/ui/admin-navigation';

import { organizationApi } from '../api/organization-api';
import { organizationApplicationAdminQueryOptions } from '../api/organization-query-options';
import type { OrganizationApplicationStatus } from '../model/organization.types';
import { OrganizationApplicationAdminList } from '../ui/organization-application-admin-list';

export function OrganizationApplicationAdminContainer({
  account,
}: {
  account?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrganizationApplicationStatus>();
  const [rejectionReasons, setRejectionReasons] = useState<
    Record<string, string>
  >({});
  const applicationsQuery = useQuery(
    organizationApplicationAdminQueryOptions(page, status),
  );
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
  const approveMutation = useMutation({
    mutationFn: organizationApi.approveApplication,
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({
    mutationFn: organizationApi.rejectApplication,
    onSuccess: invalidate,
  });
  const retryMutation = useMutation({
    mutationFn: organizationApi.retryProvisioning,
    onSuccess: invalidate,
  });
  const mutationError =
    approveMutation.error ?? rejectMutation.error ?? retryMutation.error;

  return (
    <PageShell
      account={account}
      navigation={<AdminNavigation current="applications" />}
      eyebrow="서비스 운영"
      title="조직 신청 검토"
      description="신청 정보를 확인하고 조직 생성을 승인하거나 반려합니다."
    >
      {applicationsQuery.isLoading ? (
        <SkeletonCardGrid count={2} label="조직 신청을 불러오는 중…" />
      ) : applicationsQuery.isError ? (
        <RetryErrorCard
          title="조직 신청 목록을 불러오지 못했습니다."
          description={
            applicationsQuery.error instanceof Error
              ? applicationsQuery.error.message
              : '잠시 후 다시 시도하세요.'
          }
          onRetry={() => applicationsQuery.refetch()}
        />
      ) : applicationsQuery.data ? (
        <OrganizationApplicationAdminList
          page={applicationsQuery.data}
          selectedStatus={status}
          isMutating={
            approveMutation.isPending ||
            rejectMutation.isPending ||
            retryMutation.isPending
          }
          errorMessage={
            mutationError instanceof Error ? mutationError.message : undefined
          }
          rejectionReasons={rejectionReasons}
          setRejectionReason={(id, reason) =>
            setRejectionReasons((current) => ({ ...current, [id]: reason }))
          }
          onApprove={(id) => approveMutation.mutate(id)}
          onReject={(applicationId, rejectionReason) =>
            rejectMutation.mutate({
              applicationId,
              rejectionReason: rejectionReason.trim(),
            })
          }
          onRetryProvisioning={(id) => retryMutation.mutate(id)}
          onPageChange={setPage}
          onStatusChange={(nextStatus) => {
            setStatus(nextStatus);
            setPage(1);
          }}
        />
      ) : null}
    </PageShell>
  );
}
