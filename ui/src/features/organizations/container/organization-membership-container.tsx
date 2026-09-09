'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { organizationApi } from '../api/organization-api';
import { organizationInvitationsQueryOptions } from '../api/organization-query-options';
import type { ManagedOrganization } from '../model/organization.types';
import { OrganizationMembershipManagement } from '../ui/organization-membership-management';

export function OrganizationMembershipContainer({
  organization,
}: {
  organization: ManagedOrganization;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string>();
  const [invitationLink, setInvitationLink] = useState<string>();
  const invitations = useQuery(
    organizationInvitationsQueryOptions(organization.id),
  );
  const createInvitation = useMutation({
    mutationFn: organizationApi.createInvitation,
    onSuccess: (result) => {
      setInvitationLink(
        `${window.location.origin}/organization/invitations/${encodeURIComponent(result.token)}`,
      );
      setMessage('초대 링크를 만들었습니다. 받는 사람에게 전달해 주세요.');
      void queryClient.invalidateQueries({
        queryKey: organizationInvitationsQueryOptions(organization.id).queryKey,
      });
    },
    onError: (error) =>
      setMessage(
        error instanceof Error
          ? error.message
          : '초대 링크를 만들지 못했습니다.',
      ),
  });
  return (
    <OrganizationMembershipManagement
      organizationCode={organization.code}
      invitations={invitations.data?.items ?? []}
      isCreatingInvitation={createInvitation.isPending}
      message={message}
      invitationLink={invitationLink}
      onCreateInvitation={(input) =>
        createInvitation.mutate({
          organizationGroupId: organization.id,
          ...input,
        })
      }
      onCopyLink={() =>
        invitationLink && void navigator.clipboard.writeText(invitationLink)
      }
    />
  );
}
