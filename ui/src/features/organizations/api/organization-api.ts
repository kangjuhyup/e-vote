import { unwrapVoteApiResponse } from '@/features/votes/api/votes-api';
import { voteApiFetch } from '@/shared/auth/vote-api-fetch';
import { isApiMockMode } from '@/shared/config/api-mode';

import type {
  CreateOrganizationApplicationInput,
  OrganizationApplication,
  OrganizationApplicationPage,
  OrganizationApplicationStatus,
  ManagedOrganization,
  OrganizationInvitation,
  OrganizationInvitationPage,
  OrganizationMembership,
  OrganizationMemberRole,
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
    throw new Error('조직 서비스에 연결할 수 없습니다.');
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
      throw new Error('요청한 정보를 찾을 수 없습니다.');
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
  const mockInvitations: (OrganizationInvitation & { token?: string })[] = [];

  async function fetchManagedOrganizations(): Promise<ManagedOrganization[]> {
    if (mode === 'mock') return [{ id: 'mock-organization', code: 'ORG-001' }];
    const result = await request<{ items: ManagedOrganization[] }>(
      fetcher,
      baseUrl,
      '/organizations/managed',
    );
    return result.items;
  }

  async function fetchMemberships(): Promise<OrganizationMembership[]> {
    if (mode === 'mock')
      return [
        {
          id: 'mock-organization',
          code: 'ORG-001',
          name: '샘플 조직',
          canManage: true,
        },
      ];
    const result = await request<{ items: OrganizationMembership[] }>(
      fetcher,
      baseUrl,
      '/organizations/memberships',
    );
    return result.items;
  }

  async function addExistingMember(input: {
    organizationGroupId: string;
    identifier: string;
    role: OrganizationMemberRole;
  }) {
    if (mode === 'mock')
      return {
        userId: 'mock-member',
        username: input.identifier,
        requiresReauthentication: true,
      };
    return request<{
      userId: string;
      username: string;
      requiresReauthentication: boolean;
    }>(
      fetcher,
      baseUrl,
      `/organizations/${encodeURIComponent(input.organizationGroupId)}/members`,
      {
        method: 'POST',
        body: JSON.stringify({
          identifier: input.identifier,
          role: input.role,
        }),
      },
    );
  }

  async function createInvitation(input: {
    organizationGroupId: string;
    contact: string;
    role: OrganizationMemberRole;
  }) {
    if (mode === 'mock') {
      const token = `mock-invitation-${mockInvitations.length + 1}`;
      const invitation: OrganizationInvitation & { token: string } = {
        id: token,
        organizationName: '샘플 조직',
        organizationGroupId: input.organizationGroupId,
        contactHint: input.contact.includes('@')
          ? `${input.contact.slice(0, 2)}***@${input.contact.split('@')[1]}`
          : `${input.contact.slice(0, 3)}****${input.contact.slice(-4)}`,
        role: input.role,
        status: 'PENDING',
        invitedAt: now(),
        expiresAt: new Date(Date.parse(now()) + 7 * 86_400_000).toISOString(),
        token,
      };
      mockInvitations.unshift(invitation);
      return invitation;
    }
    return request<OrganizationInvitation & { token: string }>(
      fetcher,
      baseUrl,
      `/organizations/${encodeURIComponent(input.organizationGroupId)}/invitations`,
      {
        method: 'POST',
        body: JSON.stringify({ contact: input.contact, role: input.role }),
      },
    );
  }

  async function fetchInvitations(organizationGroupId: string, page = 1) {
    if (mode === 'mock')
      return {
        items: mockInvitations.filter(
          (item) => item.organizationGroupId === organizationGroupId,
        ),
        page,
        pageSize: 20,
        totalItems: mockInvitations.length,
        totalPages: mockInvitations.length ? 1 : 0,
      };
    return request<OrganizationInvitationPage>(
      fetcher,
      baseUrl,
      `/organizations/${encodeURIComponent(organizationGroupId)}/invitations?page=${page}&pageSize=20`,
    );
  }

  async function fetchInvitation(token: string) {
    if (mode === 'mock') {
      const invitation = mockInvitations.find((item) => item.token === token);
      if (!invitation) throw new Error('초대를 찾을 수 없습니다.');
      return invitation;
    }
    return request<OrganizationInvitation>(
      fetcher,
      baseUrl,
      `/organization-invitations/${encodeURIComponent(token)}`,
    );
  }

  async function acceptInvitation(token: string) {
    if (mode === 'mock') {
      const invitation = await fetchInvitation(token);
      invitation.status = 'ACCEPTED';
      return { invitation, requiresReauthentication: true };
    }
    return request<{
      invitation: OrganizationInvitation;
      requiresReauthentication: boolean;
    }>(
      fetcher,
      baseUrl,
      `/organization-invitations/${encodeURIComponent(token)}/accept`,
      { method: 'POST' },
    );
  }

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
      const id = `organization-application-${adminApplications.length + 1}`;
      const application: OrganizationApplication = {
        ...input,
        id,
        organizationManagementNumber: `org-${id}`,
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
    acceptInvitation,
    addExistingMember,
    approveApplication,
    createApplication,
    fetchAdminApplications,
    fetchMyApplication,
    fetchManagedOrganizations,
    fetchMemberships,
    fetchInvitation,
    fetchInvitations,
    createInvitation,
    rejectApplication,
    retryProvisioning,
  };
}

export const organizationApi = createOrganizationApiClient();
