import { describe, expect, it, vi } from 'vitest';

import { createOrganizationApiClient } from '@/features/organizations/api/organization-api';

function jsonResponse(data: unknown, status = 200) {
  return Response.json(
    { success: true, data, timestamp: '2026-09-09T00:00:00.000Z' },
    { status },
  );
}

const application = {
  id: 'application/1',
  organizationName: '동부센트레빌아파트',
  organizationManagementNumber: 'apt-2026-001',
  organizationType: 'APARTMENT',
  contactName: '김관리',
  status: 'PENDING',
  submittedAt: '2026-09-09T00:00:00.000Z',
};

describe('organization api', () => {
  it('calls only Vote onboarding APIs for application and approval', async () => {
    const fetcher = vi
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockImplementation(async () => jsonResponse(application, 201));
    const client = createOrganizationApiClient({
      baseUrl: '/api/vote-server',
      fetcher,
      mode: 'live',
    });

    await client.createApplication({
      organizationName: '동부센트레빌아파트',
      organizationType: 'APARTMENT',
      contactName: '김관리',
    });
    await client.approveApplication('application/1');

    expect(fetcher.mock.calls[0]?.[0]).toBe(
      '/api/vote-server/organization-applications',
    );
    expect(fetcher.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({
        organizationName: '동부센트레빌아파트',
        organizationType: 'APARTMENT',
        contactName: '김관리',
      }),
    );
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      '/api/vote-server/admin/organization-applications/application%2F1/approve',
    );
    expect(
      fetcher.mock.calls.every(
        ([url]) => !String(url).includes('/admin/groups'),
      ),
    ).toBe(true);
  });

  it('treats a missing current application as an empty onboarding state', async () => {
    const client = createOrganizationApiClient({
      baseUrl: '/api/vote-server',
      fetcher: vi
        .fn<(input: string, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(jsonResponse({}, 404)),
      mode: 'live',
    });
    await expect(client.fetchMyApplication()).resolves.toBeNull();
  });

  it('sends only the rejection reason to the Vote server', async () => {
    const fetcher = vi
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(jsonResponse({ ...application, status: 'REJECTED' }));
    const client = createOrganizationApiClient({
      baseUrl: '/api/vote-server',
      fetcher,
      mode: 'live',
    });

    await client.rejectApplication({
      applicationId: 'application/1',
      rejectionReason: '서류 확인 필요',
    });

    expect(fetcher).toHaveBeenCalledWith(
      '/api/vote-server/admin/organization-applications/application%2F1/reject',
      expect.objectContaining({
        body: JSON.stringify({ rejectionReason: '서류 확인 필요' }),
        method: 'POST',
      }),
    );
  });

  it('maps Auth provisioning unavailability to user-facing language', async () => {
    const client = createOrganizationApiClient({
      baseUrl: '/api/vote-server',
      fetcher: vi
        .fn<(input: string, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(jsonResponse({}, 503)),
      mode: 'live',
    });
    await expect(client.approveApplication('application-1')).rejects.toThrow(
      '조직 설정이 지연되고 있습니다',
    );
  });

  it('creates invitations only through the Vote organization API', async () => {
    const fetcher = vi
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockImplementation(async () =>
        jsonResponse({ id: 'invite-1', token: 'one-time-token' }),
      );
    const client = createOrganizationApiClient({
      baseUrl: '/api/vote-server',
      fetcher,
      mode: 'live',
    });
    await client.createInvitation({
      organizationGroupId: 'org/1',
      contact: 'new@example.com',
      role: 'MANAGER',
    });
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      '/api/vote-server/organizations/org%2F1/invitations',
    ]);
    expect(
      fetcher.mock.calls.every(
        ([url]) => !String(url).includes('/admin/users'),
      ),
    ).toBe(true);
  });
});
