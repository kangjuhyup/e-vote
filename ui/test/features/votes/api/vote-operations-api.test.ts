import { describe, expect, it, vi } from 'vitest';

import { createVoteOperationsApiClient } from '@/features/votes/api/vote-operations-api';
import { electoralRollMockState } from '@/features/votes/api/electoral-roll-fixtures';
import { ELECTORAL_ROLL_IDENTITY_REQUIRED_MESSAGE } from '@/features/votes/model/electoral-roll.types';

function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: '2026-08-30T00:00:00.000Z',
    }),
    { status },
  );
}

function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error: { message, statusCode: status, path: '/votes' },
      timestamp: '2026-09-02T00:00:00.000Z',
    }),
    { status },
  );
}

const voteId = '11111111-1111-4111-8111-111111111111';
const commissionId = '22222222-2222-4222-8222-222222222222';
const electoralRollId = '33333333-3333-4333-8333-333333333333';
const snapshotId = '44444444-4444-4444-8444-444444444444';
const startedAt = '2026-09-10T00:00:00.000Z';
const endedAt = '2026-09-10T09:00:00.000Z';

describe('vote operations api', () => {
  it('keeps operations and mutations in memory without calling live APIs in mock mode', async () => {
    const fetcher = vi.fn();
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'mock',
    });

    await expect(
      client.fetchSubVoteOperations(
        'active-general',
        'representative-election',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'OPEN',
        title: '대표 후보 선출',
      }),
    );

    const commission = await client.createCommission('테스트 선거관리위원회');
    await expect(client.fetchCommissions()).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ id: commission.id }),
        ]),
      }),
    );
    await expect(client.fetchFieldSessions('active-general')).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ voteId: 'active-general' }),
        ]),
      }),
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('creates the vote before attaching only the selected electoral roll id', async () => {
    const fetcher = vi.fn(async (_input: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        return jsonResponse({ memberCount: 2, snapshotId, voteId });
      }
      return jsonResponse({ commissionId, id: voteId, status: 'DRAFT' }, 201);
    });
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com/',
      fetcher,
      mode: 'live',
    });
    const input = {
      defaultPolicy: {
        participationUnit: 'INDIVIDUAL' as const,
        privacyMode: 'SECRET' as const,
        resultStorageMode: 'DATABASE' as const,
        voteWeightMode: 'EQUAL' as const,
      },
      identityVerificationPolicy: { required: false },
      commissionId,
      endedAt,
      electoralRollId,
      startedAt,
      title: '2026 대표 선출',
      votingChannels: ['ONLINE' as const],
    };

    await expect(client.createVote(input)).resolves.toEqual(
      expect.objectContaining({
        electoralRollId,
        electoralRollSnapshotId: snapshotId,
        id: voteId,
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/votes',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      commissionId,
      defaultPolicy: input.defaultPolicy,
      endedAt,
      identityVerificationPolicy: input.identityVerificationPolicy,
      startedAt,
      title: input.title,
      votingChannels: input.votingChannels,
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      `https://api.example.com/votes/${voteId}/electoral-roll-snapshot`,
      expect.objectContaining({
        body: JSON.stringify({ electoralRollId }),
        method: 'PUT',
      }),
    );
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
      electoralRollId,
    });
  });

  it('surfaces UUID validation errors from electoral-roll attachment', async () => {
    const fetcher = vi.fn(async (_input: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? jsonResponse({ commissionId, id: voteId, status: 'DRAFT' }, 201)
        : errorResponse('electoralRollId must be a UUID'),
    );
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });

    await expect(
      client.createVote({
        commissionId,
        defaultPolicy: {
          participationUnit: 'INDIVIDUAL',
          privacyMode: 'SECRET',
          resultStorageMode: 'DATABASE',
          voteWeightMode: 'EQUAL',
        },
        endedAt,
        electoralRollId: 'invalid',
        identityVerificationPolicy: { required: false },
        startedAt,
        title: '잘못된 명부 연결',
        votingChannels: ['ONLINE'],
      }),
    ).rejects.toThrow('electoralRollId must be a UUID');
  });

  it('replaces a draft vote electoral roll with only the selected roll id', async () => {
    const replacementElectoralRollId =
      '55555555-5555-4555-8555-555555555555';
    const fetcher = vi.fn(async () =>
      jsonResponse({ memberCount: 25, snapshotId, voteId }),
    );
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });

    await expect(
      client.attachElectoralRoll({
        electoralRollId: replacementElectoralRollId,
        voteId,
      }),
    ).resolves.toEqual({ memberCount: 25, snapshotId, voteId });
    expect(fetcher).toHaveBeenCalledWith(
      `https://api.example.com/votes/${voteId}/electoral-roll-snapshot`,
      expect.objectContaining({
        body: JSON.stringify({
          electoralRollId: replacementElectoralRollId,
        }),
        method: 'PUT',
      }),
    );
  });

  it('maps an identity-required roll attachment 400 to actionable guidance', async () => {
    const fetcher = vi.fn(async (input: string, init?: RequestInit) => {
      void input;
      void init;
      return errorResponse(
        'all electoral roll members require identity verification data for this vote',
      );
    });
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });

    await expect(
      client.attachElectoralRoll({
        electoralRollId,
        identityVerificationRequired: true,
        voteId,
      }),
    ).rejects.toThrow(ELECTORAL_ROLL_IDENTITY_REQUIRED_MESSAGE);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      electoralRollId,
    });
  });

  it('preserves other attachment 400 details for identity-required votes', async () => {
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher: vi.fn(async () =>
        errorResponse('electoralRollId must be a UUID'),
      ),
      mode: 'live',
    });

    await expect(
      client.attachElectoralRoll({
        electoralRollId: 'invalid',
        identityVerificationRequired: true,
        voteId,
      }),
    ).rejects.toThrow('electoralRollId must be a UUID');
  });

  it('creates an authenticated elector link without calling an invitation API', async () => {
    const fetcher = vi.fn();
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
      participationBaseUrl: 'https://vote.example.com',
    });

    const result = await client.issueParticipationInvitation({
      electorId: 'elector /1',
      voteId: 'vote /1',
    });

    expect(result.participationUrl).toBe(
      'https://vote.example.com/participate?voteId=vote+%2F1&electorId=elector+%2F1',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects incomplete mock rolls for identity-required votes', async () => {
    const client = createVoteOperationsApiClient({ mode: 'mock' });

    await expect(
      client.createVote({
        commissionId: 'commission-1',
        defaultPolicy: {
          participationUnit: 'INDIVIDUAL',
          privacyMode: 'SECRET',
          resultStorageMode: 'DATABASE',
          voteWeightMode: 'EQUAL',
        },
        endedAt,
        electoralRollId: 'electoral-roll-1',
        identityVerificationPolicy: { required: true },
        startedAt,
        title: '본인인증 명부 검증',
        votingChannels: ['ONLINE'],
      }),
    ).rejects.toThrow(ELECTORAL_ROLL_IDENTITY_REQUIRED_MESSAGE);
  });

  it('connects the latest existing roll snapshot in mock mode without creating one', async () => {
    const client = createVoteOperationsApiClient({ mode: 'mock' });
    const snapshotCount = electoralRollMockState.snapshots.length;

    const result = await client.createVote({
      commissionId: 'commission-1',
      defaultPolicy: {
        participationUnit: 'INDIVIDUAL',
        privacyMode: 'SECRET',
        resultStorageMode: 'DATABASE',
        voteWeightMode: 'EQUAL',
      },
      endedAt,
      electoralRollId: 'electoral-roll-1',
      identityVerificationPolicy: { required: false },
      startedAt,
      title: '기존 명부 연결 투표',
      votingChannels: ['ONLINE'],
    });

    expect(result).toMatchObject({
      electoralRollId: 'electoral-roll-1',
      electoralRollSnapshotId: 'electoral-roll-snapshot-1',
    });
    expect(electoralRollMockState.snapshots).toHaveLength(snapshotCount);
  });

  it('updates draft vote settings without changing its assigned commission', async () => {
    const fetcher = vi.fn(async (requestUrl: string, init?: RequestInit) => {
      expect(requestUrl).toBe('https://api.example.com/votes/vote-1');
      expect(init?.method).toBe('PATCH');
      return jsonResponse({ id: 'vote-1', status: 'DRAFT' });
    });
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });
    const input = {
      voteId: 'vote-1',
      defaultPolicy: {
        participationUnit: 'INDIVIDUAL' as const,
        privacyMode: 'SECRET' as const,
        resultStorageMode: 'DATABASE' as const,
        voteWeightMode: 'EQUAL' as const,
      },
      identityVerificationPolicy: { required: false },
      endedAt,
      startedAt,
      title: '수정한 투표',
      votingChannels: ['ONLINE' as const],
    };

    await expect(client.updateVote(input)).resolves.toEqual(
      expect.objectContaining({ id: 'vote-1' }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.com/votes/vote-1',
      expect.objectContaining({
        method: 'PATCH',
      }),
    );
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      defaultPolicy: input.defaultPolicy,
      endedAt,
      identityVerificationPolicy: input.identityVerificationPolicy,
      startedAt,
      title: input.title,
      votingChannels: input.votingChannels,
    });
  });

  it('deletes a vote through the encoded vote endpoint without a request body', async () => {
    const fetcher = vi.fn(async (input: string, init?: RequestInit) => {
      expect(input).toBe('https://api.example.com/votes/vote%20%2F1');
      expect(init?.method).toBe('DELETE');
      return jsonResponse({ id: voteId, status: 'CANCELED' });
    });
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });

    await expect(client.deleteVote('vote /1')).resolves.toEqual({
      id: voteId,
      status: 'CANCELED',
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.com/votes/vote%20%2F1',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        method: 'DELETE',
      }),
    );
    expect(fetcher.mock.calls[0]?.[1]?.body).toBeUndefined();
  });

  it('deletes an elector through the encoded nested endpoint without a request body', async () => {
    const fetcher = vi.fn(async (input: string, init?: RequestInit) => {
      expect(input).toBe(
        'https://api.example.com/votes/vote%20%2F1/electors/elector%20%2F1',
      );
      expect(init?.method).toBe('DELETE');
      return jsonResponse({
        id: 'elector-1',
        status: 'BLOCKED',
        voteId,
      });
    });
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });

    await expect(
      client.deleteElector({ electorId: 'elector /1', voteId: 'vote /1' }),
    ).resolves.toEqual({
      id: 'elector-1',
      status: 'BLOCKED',
      voteId,
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.com/votes/vote%20%2F1/electors/elector%20%2F1',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        method: 'DELETE',
      }),
    );
    expect(fetcher.mock.calls[0]?.[1]?.body).toBeUndefined();
  });

  it('treats unavailable turnout and pre-close results as valid empty states', async () => {
    const fetcher = vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/turnout')) {
        return new Response(null, { status: 404 });
      }
      if (url.pathname.endsWith('/results')) {
        return new Response(null, { status: 409 });
      }
      if (url.pathname.endsWith('/candidates')) {
        return jsonResponse({
          items: [
            {
              attachments: [
                {
                  createdAt: '2026-09-06T12:00:00.000Z',
                  fileId: 'candidate-file-1',
                  id: 'candidate-attachment-1',
                  mimeType: 'application/pdf',
                  originalName: '공약.pdf',
                  sizeBytes: 2048,
                  sortOrder: 0,
                  type: 'PLEDGE',
                },
              ],
              candidateNo: 1,
              description: '후보 소개',
              id: 'candidate-1',
              name: '김후보',
              status: 'ACTIVE',
            },
          ],
          page: 1,
          pageSize: 100,
          totalItems: 0,
          totalPages: 1,
        });
      }
      if (url.pathname.endsWith('/sub-votes/detail-1')) {
        return jsonResponse({
          attachments: [
            {
              createdAt: '2026-09-06T12:00:00.000Z',
              fileId: 'detail-file-1',
              id: 'detail-attachment-1',
              mimeType: 'application/pdf',
              originalName: '안건 안내.pdf',
              sizeBytes: 1024,
              sortOrder: 0,
              type: 'GUIDE',
            },
          ],
          description: '대표 선출',
          id: 'detail-1',
          sortOrder: 0,
          status: 'OPEN',
          title: '대표자 선출',
          type: 'CANDIDATE',
          voteId: 'vote-1',
        });
      }
      return jsonResponse({
        defaultPolicy: {
          participationUnit: 'INDIVIDUAL',
          privacyMode: 'SECRET',
          resultStorageMode: 'DATABASE',
          voteWeightMode: 'EQUAL',
        },
      });
    });
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });

    await expect(
      client.fetchSubVoteOperations('vote-1', 'detail-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({ id: 'detail-attachment-1' }),
        ],
        candidates: [
          expect.objectContaining({
            attachments: [
              expect.objectContaining({ id: 'candidate-attachment-1' }),
            ],
          }),
        ],
        result: null,
        turnout: null,
      }),
    );
  });

  it('loads a commission page and hydrates members from the detail endpoint', async () => {
    const fetcher = vi.fn(async (input: string) => {
      if (input.endsWith('/election-commissions/commission-1')) {
        return jsonResponse({
          createdAt: '2026-08-30T00:00:00.000Z',
          id: 'commission-1',
          members: [
            {
              commissionId: 'commission-1',
              id: 'member-1',
              name: '김*',
              registeredAt: '2026-08-30T00:01:00.000Z',
              role: 'FIELD_MANAGER',
              status: 'ACTIVE',
              updatedAt: '2026-08-30T00:01:00.000Z',
            },
          ],
          name: '중앙 선거관리위원회',
          status: 'ACTIVE',
          updatedAt: '2026-08-30T00:00:00.000Z',
        });
      }

      return jsonResponse({
        items: [
          {
            createdAt: '2026-08-30T00:00:00.000Z',
            id: 'commission-1',
            name: '중앙 선거관리위원회',
            status: 'ACTIVE',
            updatedAt: '2026-08-30T00:00:00.000Z',
          },
        ],
        page: 2,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
      });
    });
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });

    await expect(client.fetchCommissions(2, 10)).resolves.toEqual({
      items: [
        {
          id: 'commission-1',
          members: [
            {
              id: 'member-1',
              name: '김*',
              role: 'FIELD_MANAGER',
              status: 'ACTIVE',
            },
          ],
          name: '중앙 선거관리위원회',
          status: 'ACTIVE',
        },
      ],
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/election-commissions?page=2&pageSize=10',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/election-commissions/commission-1',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('loads one commission for the management detail view', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        createdAt: '2026-08-30T00:00:00.000Z',
        id: 'commission/1',
        members: [
          {
            commissionId: 'commission/1',
            id: 'member-1',
            name: '김관리',
            registeredAt: '2026-08-30T00:01:00.000Z',
            role: 'ADMIN',
            status: 'ACTIVE',
            updatedAt: '2026-08-30T00:01:00.000Z',
          },
        ],
        name: '중앙 선거관리위원회',
        status: 'ACTIVE',
        updatedAt: '2026-08-30T00:00:00.000Z',
      }),
    );
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });

    await expect(client.fetchCommission('commission/1')).resolves.toMatchObject({
      id: 'commission/1',
      members: [expect.objectContaining({ name: '김관리' })],
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.com/election-commissions/commission%2F1',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('updates and deletes commission resources without parsing 204 bodies', async () => {
    const memberId = '55555555-5555-4555-8555-555555555555';
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });

    await expect(
      client.updateCommissionMember({
        commissionId,
        memberId,
        name: '김관리',
        role: 'FIELD_MANAGER',
      }),
    ).resolves.toBeUndefined();
    await expect(
      client.deleteCommissionMember({ commissionId, memberId }),
    ).resolves.toBeUndefined();
    await expect(
      client.deleteCommission({ commissionId }),
    ).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      `https://api.example.com/election-commissions/${commissionId}/members/${memberId}`,
      expect.objectContaining({
        body: JSON.stringify({ name: '김관리', role: 'FIELD_MANAGER' }),
        method: 'PATCH',
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      `https://api.example.com/election-commissions/${commissionId}/members/${memberId}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      `https://api.example.com/election-commissions/${commissionId}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('loads field sessions through the vote-scoped page endpoint', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            address: '서울시 중구',
            channel: 'ONSITE',
            commissionId: 'commission-1',
            createdAt: '2026-08-30T00:00:00.000Z',
            endsAt: '2026-09-01T09:00:00.000Z',
            id: 'session-1',
            locationName: '중앙 회의실',
            managerIds: ['member-1'],
            startsAt: '2026-09-01T00:00:00.000Z',
            status: 'SCHEDULED',
            title: '현장 투표',
            updatedAt: '2026-08-30T00:00:00.000Z',
            voteId: 'vote /1',
          },
        ],
        page: 2,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
      }),
    );
    const client = createVoteOperationsApiClient({
      baseUrl: 'https://api.example.com',
      fetcher,
      mode: 'live',
    });

    await expect(client.fetchFieldSessions('vote /1', 2, 10)).resolves.toEqual({
      items: [expect.objectContaining({ id: 'session-1', voteId: 'vote /1' })],
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.com/votes/vote%20%2F1/field-voting-sessions?page=2&pageSize=10',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });
});
