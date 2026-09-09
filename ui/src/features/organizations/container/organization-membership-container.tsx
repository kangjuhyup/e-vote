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
  const addMember = useMutation({
    mutationFn: organizationApi.addExistingMember,
    onSuccess: (result) =>
      setMessage(
        `${result.username}님을 조직에 추가했습니다. 새 권한은 다음 로그인부터 적용됩니다.`,
      ),
    onError: (error) =>
      setMessage(
        error instanceof Error ? error.message : '회원을 추가하지 못했습니다.',
      ),
  });
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
      isAdding={addMember.isPending}
      isCreatingInvitation={createInvitation.isPending}
      message={message}
      invitationLink={invitationLink}
      onAddMember={(input) =>
        addMember.mutate({ organizationGroupId: organization.id, ...input })
      }
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
