import { unwrapVoteApiResponse } from '@/features/votes/api/votes-api';
import { voteApiFetch } from '@/shared/auth/vote-api-fetch';
import { isApiMockMode } from '@/shared/config/api-mode';

import type {
  CreateOrganizationApplicationInput,
  OrganizationApplication,
  OrganizationApplicationPage,
  OrganizationApplicationStatus,
  RejectOrganizationApplicationInput,
} from '../model/organization.types';

type ApiFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface CreateOrganizationApiClientOptions {
  baseUrl?: string;
  fetcher?: ApiFetcher;
  mode?: 'live' | 'mock';
  now?: () => string;
}

function resolveBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_VOTE_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    ''
  ).replace(/\/+$/, '');
}

async function request<T>(
  fetcher: ApiFetcher,
  baseUrl: string,
  path: string,
  init: RequestInit = {},
) {
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode');
  }

  const response = await fetcher(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 400)
      throw new Error('입력한 조직 정보를 확인해 주세요.');
    if (response.status === 403)
      throw new Error('이 요청을 처리할 권한이 없습니다.');
    if (response.status === 404)
      throw new Error('조직 신청을 찾을 수 없습니다.');
    if (response.status === 409)
      throw new Error('이미 처리 중인 신청이 있거나 조직 정보가 중복됩니다.');
    if (response.status === 503)
      throw new Error(
        '조직 설정이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',
      );
    throw new Error(
      '조직 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    );
  }

  return unwrapVoteApiResponse<T>(await response.json());
}

export function createOrganizationApiClient(
  options: CreateOrganizationApiClientOptions = {},
) {
  const mode = options.mode ?? (isApiMockMode() ? 'mock' : 'live');
  const baseUrl = (options.baseUrl ?? resolveBaseUrl()).replace(/\/+$/, '');
  const fetcher = options.fetcher ?? voteApiFetch;
  const now = options.now ?? (() => new Date().toISOString());
  let currentApplication: OrganizationApplication | undefined;
  const adminApplications: OrganizationApplication[] = [];

  async function fetchMyApplication() {
    if (mode === 'mock') return currentApplication ?? null;
    const response = await fetcher(`${baseUrl}/organization-applications/me`, {
      headers: { Accept: 'application/json' },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      if (response.status === 403)
        throw new Error('조직 신청을 조회할 권한이 없습니다.');
      throw new Error('조직 신청 상태를 불러오지 못했습니다.');
    }
    return unwrapVoteApiResponse<OrganizationApplication>(
      await response.json(),
    );
  }

  async function createApplication(input: CreateOrganizationApplicationInput) {
    if (mode === 'mock') {
      const application: OrganizationApplication = {
        ...input,
        id: `organization-application-${adminApplications.length + 1}`,
        status: 'PENDING',
        submittedAt: now(),
      };
      currentApplication = application;
      adminApplications.unshift(application);
      return application;
    }
    return request<OrganizationApplication>(
      fetcher,
      baseUrl,
      '/organization-applications',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  async function fetchAdminApplications(
    page = 1,
    pageSize = 20,
    status?: OrganizationApplicationStatus,
  ) {
    if (mode === 'mock') {
      const filtered = status
        ? adminApplications.filter((item) => item.status === status)
        : adminApplications;
      const offset = (page - 1) * pageSize;
      return {
        items: filtered.slice(offset, offset + pageSize),
        page,
        pageSize,
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      } satisfies OrganizationApplicationPage;
    }
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (status) query.set('status', status);
    return request<OrganizationApplicationPage>(
      fetcher,
      baseUrl,
      `/admin/organization-applications?${query}`,
    );
  }

  async function approveApplication(applicationId: string) {
    if (mode === 'mock') return updateMock(applicationId, 'APPROVED');
    return request<OrganizationApplication>(
      fetcher,
      baseUrl,
      `/admin/organization-applications/${encodeURIComponent(applicationId)}/approve`,
      { method: 'POST' },
    );
  }

  async function rejectApplication(input: RejectOrganizationApplicationInput) {
    if (mode === 'mock')
      return updateMock(input.applicationId, 'REJECTED', input.rejectionReason);
    return request<OrganizationApplication>(
      fetcher,
      baseUrl,
      `/admin/organization-applications/${encodeURIComponent(input.applicationId)}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ rejectionReason: input.rejectionReason }),
      },
    );
  }

  async function retryProvisioning(applicationId: string) {
    if (mode === 'mock') return updateMock(applicationId, 'PROVISIONING');
    return request<OrganizationApplication>(
      fetcher,
      baseUrl,
      `/admin/organization-applications/${encodeURIComponent(applicationId)}/retry-provisioning`,
      { method: 'POST' },
    );
  }

  function updateMock(
    applicationId: string,
    status: OrganizationApplicationStatus,
    rejectionReason?: string,
  ) {
    const index = adminApplications.findIndex(
      (item) => item.id === applicationId,
    );
    if (index < 0) throw new Error('조직 신청을 찾을 수 없습니다.');
    const updated: OrganizationApplication = {
      ...adminApplications[index],
      status,
      reviewedAt: now(),
      ...(rejectionReason ? { rejectionReason } : {}),
    };
    adminApplications[index] = updated;
    if (currentApplication?.id === applicationId) currentApplication = updated;
    return updated;
  }

  return {
    approveApplication,
    createApplication,
    fetchAdminApplications,
    fetchMyApplication,
    rejectApplication,
    retryProvisioning,
  };
}

export const organizationApi = createOrganizationApiClient();
