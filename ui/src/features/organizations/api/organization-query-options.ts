import { queryOptions } from '@tanstack/react-query';

import { resolveApiMode } from '@/shared/config/api-mode';

import type { OrganizationApplicationStatus } from '../model/organization.types';
import { organizationApi } from './organization-api';

const apiMode = resolveApiMode();

export function myOrganizationApplicationQueryOptions() {
  return queryOptions({
    queryKey: ['organizations', apiMode, 'applications', 'me'],
    queryFn: organizationApi.fetchMyApplication,
  });
}

export function managedOrganizationsQueryOptions() {
  return queryOptions({
    queryKey: ['organizations', apiMode, 'managed'],
    queryFn: organizationApi.fetchManagedOrganizations,
  });
}

export function organizationMembershipsQueryOptions() {
  return queryOptions({
    queryKey: ['organizations', apiMode, 'memberships'],
    queryFn: organizationApi.fetchMemberships,
  });
}

export function organizationInvitationsQueryOptions(
  organizationGroupId: string,
) {
  return queryOptions({
    queryKey: ['organizations', apiMode, organizationGroupId, 'invitations'],
    queryFn: () => organizationApi.fetchInvitations(organizationGroupId),
    enabled: Boolean(organizationGroupId),
  });
}

export function organizationInvitationQueryOptions(token: string) {
  return queryOptions({
    queryKey: ['organization-invitations', token],
    queryFn: () => organizationApi.fetchInvitation(token),
  });
}

export function organizationApplicationAdminQueryOptions(
  page: number,
  status?: OrganizationApplicationStatus,
) {
  return queryOptions({
    queryKey: [
      'organizations',
      apiMode,
      'applications',
      'admin',
      page,
      status ?? 'ALL',
    ],
    queryFn: () => organizationApi.fetchAdminApplications(page, 20, status),
  });
}
