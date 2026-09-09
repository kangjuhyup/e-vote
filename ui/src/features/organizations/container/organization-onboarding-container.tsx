'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { RetryErrorCard } from '@/components/feedback/retry-error-card';
import { SkeletonCardGrid } from '@/components/feedback/skeleton-card-grid';
import { PageShell } from '@/components/layout/page-shell';
import { isApiMockMode } from '@/shared/config/api-mode';

import { organizationApi } from '../api/organization-api';
import {
  managedOrganizationsQueryOptions,
  myOrganizationApplicationQueryOptions,
  organizationMembershipsQueryOptions,
} from '../api/organization-query-options';
import { OrganizationApplicationForm } from '../ui/organization-application-form';
import { OrganizationApplicationStatus } from '../ui/organization-application-status';
import { OrganizationMembershipSummary } from '../ui/organization-membership-summary';
import { OrganizationMembershipContainer } from './organization-membership-container';

export function OrganizationOnboardingContainer({
  account,
}: {
  account?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const applicationQuery = useQuery(myOrganizationApplicationQueryOptions());
  const managedOrganizationsQuery = useQuery(
    managedOrganizationsQueryOptions(),
  );
  const membershipsQuery = useQuery(organizationMembershipsQueryOptions());
  const createMutation = useMutation({
    mutationFn: organizationApi.createApplication,
    onSuccess: (application) => {
      queryClient.setQueryData(
        myOrganizationApplicationQueryOptions().queryKey,
        application,
      );
      setShowForm(false);
    },
  });
  const application = applicationQuery.data;

  return (
    <PageShell
      account={account}
      eyebrow="조직"
      title="조직 신청 및 권한"
      description="조직 생성 신청 상태를 확인하고 승인 후 투표 관리 권한을 갱신합니다."
    >
      {applicationQuery.isLoading || membershipsQuery.isLoading ? (
        <SkeletonCardGrid count={1} label="조직 신청을 불러오는 중…" />
      ) : applicationQuery.isError || membershipsQuery.isError ? (
        <RetryErrorCard
          title="조직 신청을 불러오지 못했습니다."
          description={
            applicationQuery.error instanceof Error
              ? applicationQuery.error.message
              : '잠시 후 다시 시도하세요.'
          }
          onRetry={() => {
            void applicationQuery.refetch();
            void membershipsQuery.refetch();
          }}
        />
      ) : (membershipsQuery.data?.length ?? 0) > 0 ? (
        <div className="space-y-5">
          {membershipsQuery.data?.map((membership) => (
            <OrganizationMembershipSummary
              key={membership.id}
              membership={membership}
            />
          ))}
          {managedOrganizationsQuery.data?.map((organization) => (
            <OrganizationMembershipContainer
              key={organization.id}
              organization={organization}
            />
          ))}
        </div>
      ) : application && !showForm ? (
        <OrganizationApplicationStatus
          application={application}
          onReapply={
            application.status === 'REJECTED'
              ? () => setShowForm(true)
              : undefined
          }
          onReauthenticate={
            application.status === 'APPROVED' && !isApiMockMode()
              ? () => void signOut({ redirectTo: '/organization' })
              : undefined
          }
        />
      ) : (
        <OrganizationApplicationForm
          errorMessage={
            createMutation.error instanceof Error
              ? createMutation.error.message
              : undefined
          }
          isSubmitting={createMutation.isPending}
          onSubmit={(input) => createMutation.mutate(input)}
        />
      )}
    </PageShell>
  );
}
