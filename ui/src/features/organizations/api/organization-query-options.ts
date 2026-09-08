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
