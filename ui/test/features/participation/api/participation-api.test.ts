import { describe, expect, it, vi } from 'vitest';

import {
  createParticipationApiClient,
  getParticipationErrorMessage,
} from '@/features/participation/api/participation-api';
import { VoteApiError } from '@/shared/api/vote-api-error';

function envelope(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('participationApi', () => {
  it('loads only the authenticated vote detail and maps active candidates', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      envelope({
        id: '11111111-1111-4111-8111-111111111111',
        title: '대표 선출',
        description: '안내',
        status: 'OPEN',
        startedAt: '2026-09-06T00:00:00.000Z',
        endedAt: '2026-09-07T00:00:00.000Z',
        votingChannels: ['ONLINE'],
        identityVerificationPolicy: { required: false },
        voteDetails: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            title: '회장 선출',
            description: '',
            type: 'CANDIDATE',
            sortOrder: 1,
            status: 'OPEN',
            candidates: [
              {
                id: '33333333-3333-4333-8333-333333333333',
                candidateNo: 1,
                name: '김후보',
                description: '',
                status: 'ACTIVE',
              },
              {
                id: '44444444-4444-4444-8444-444444444444',
                candidateNo: 2,
                name: '이후보',
                description: '',
                status: 'WITHDRAWN',
              },
            ],
          },
        ],
      }),
    );
    const client = createParticipationApiClient({
      baseUrl: '/api/vote-server',
      fetcher,
      mode: 'live',
    });

    const result = await client.getAccess({
      electorId: '55555555-5555-4555-8555-555555555555',
      electorLabel: '로그인 사용자',
      voteId: '11111111-1111-4111-8111-111111111111',
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      '/api/vote-server/votes/11111111-1111-4111-8111-111111111111',
      expect.any(Object),
    );
    expect(result.elector).toEqual({
      identityVerified: false,
      label: '로그인 사용자',
    });
    expect(result.ballots[0].candidates).toHaveLength(1);
  });

  it('uses a fresh Mock transaction ID and trusts identityVerified rather than HTTP 200', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        envelope({
          id: '55555555-5555-4555-8555-555555555555',
          voteId: '11111111-1111-4111-8111-111111111111',
          identityVerified: false,
        }),
      )
      .mockResolvedValueOnce(
        envelope({
          id: '55555555-5555-4555-8555-555555555555',
          voteId: '11111111-1111-4111-8111-111111111111',
          identityVerified: true,
        }),
      );
    const randomUuid = vi
      .fn()
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
      .mockReturnValueOnce('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    const client = createParticipationApiClient({
      baseUrl: '/api/vote-server',
      fetcher,
      mode: 'live',
      randomUuid,
    });
    const input = {
      electorId: '55555555-5555-4555-8555-555555555555',
      voteId: '11111111-1111-4111-8111-111111111111',
    };

    await expect(client.authenticate(input)).resolves.toMatchObject({
      identityVerified: false,
    });
    await expect(client.authenticate(input)).resolves.toMatchObject({
      identityVerified: true,
    });

    const bodies = fetcher.mock.calls.map(([, init]) =>
      JSON.parse(String((init as RequestInit).body)),
    );
    expect(bodies).toEqual([
      {
        provider: 'MOCK',
        transactionId:
          'mock-success:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
      {
        provider: 'MOCK',
        transactionId:
          'mock-success:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      },
    ]);
  });

  it('submits one online child ballot with the authenticated elector contract', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      envelope(
        {
          id: '66666666-6666-4666-8666-666666666666',
          voteDetailId: '22222222-2222-4222-8222-222222222222',
          status: 'CAST',
        },
        201,
      ),
    );
    const client = createParticipationApiClient({
      baseUrl: '/api/vote-server',
      fetcher,
      mode: 'live',
    });

    await client.cast({
      voteId: '11111111-1111-4111-8111-111111111111',
      voteDetailId: '22222222-2222-4222-8222-222222222222',
      electorId: '55555555-5555-4555-8555-555555555555',
      selectedCandidateId: '33333333-3333-4333-8333-333333333333',
    });

    expect(fetcher).toHaveBeenCalledWith(
      '/api/vote-server/participations',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      voteId: '11111111-1111-4111-8111-111111111111',
      voteDetailId: '22222222-2222-4222-8222-222222222222',
      electorId: '55555555-5555-4555-8555-555555555555',
      selectedCandidateId: '33333333-3333-4333-8333-333333333333',
      votingChannel: 'ONLINE',
    });
  });

  it('does not describe a 409 cast conflict as completed', () => {
    expect(
      getParticipationErrorMessage(
        new VoteApiError('duplicate', 409),
        'cast',
      ),
    ).toContain('중복 제출은 완료로 처리되지 않습니다');
  });

  it('keeps preview loading, authentication, and casting fully local', async () => {
    const fetcher = vi.fn();
    const client = createParticipationApiClient({
      fetcher,
      mode: 'mock',
      randomUuid: () => '77777777-7777-4777-8777-777777777777',
    });

    await client.getAccess({
      electorId: '55555555-5555-4555-8555-555555555555',
      electorLabel: '미리보기 선거인',
      voteId: '11111111-1111-4111-8111-111111111111',
    });
    await client.authenticate({
      electorId: '55555555-5555-4555-8555-555555555555',
      voteId: '11111111-1111-4111-8111-111111111111',
    });
    await client.cast({
      electorId: '55555555-5555-4555-8555-555555555555',
      selectedCandidateId: '33333333-3333-4333-8333-333333333333',
      voteDetailId: '22222222-2222-4222-8222-222222222222',
      voteId: '11111111-1111-4111-8111-111111111111',
    });

    expect(fetcher).not.toHaveBeenCalled();
  });
});
