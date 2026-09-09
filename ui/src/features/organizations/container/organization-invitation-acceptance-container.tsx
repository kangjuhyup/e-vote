'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';

import { RetryErrorCard } from '@/components/feedback/retry-error-card';

import { organizationApi } from '../api/organization-api';
import { organizationInvitationQueryOptions } from '../api/organization-query-options';
import { OrganizationInvitationAcceptance } from '../ui/organization-invitation-acceptance';

export function OrganizationInvitationAcceptanceContainer({
  token,
}: {
  token: string;
}) {
  const invitation = useQuery(organizationInvitationQueryOptions(token));
  const accept = useMutation({
    mutationFn: () => organizationApi.acceptInvitation(token),
  });
  if (invitation.isPending)
    return (
      <main className="p-8 text-center" role="status">
        초대를 확인하는 중…
      </main>
    );
  if (invitation.isError || !invitation.data)
    return (
      <main className="mx-auto max-w-lg p-8">
        <RetryErrorCard
          title="초대를 확인할 수 없습니다."
          description="링크가 올바른지 확인해 주세요."
          onRetry={() => invitation.refetch()}
        />
      </main>
    );
  return (
    <OrganizationInvitationAcceptance
      invitation={invitation.data}
      isAccepting={accept.isPending}
      accepted={accept.isSuccess}
      error={accept.error instanceof Error ? accept.error.message : undefined}
      onAccept={() =>
        accept.mutate(undefined, {
          onSuccess: () =>
            setTimeout(
              () =>
                void signOut({
                  redirectTo: `/organization/invitations/${encodeURIComponent(token)}`,
                }),
              1200,
            ),
        })
      }
    />
  );
}
