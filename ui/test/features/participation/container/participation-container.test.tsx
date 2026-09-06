/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ParticipationContainer } from '@/features/participation/container/participation-container';

const api = vi.hoisted(() => ({
  authenticate: vi.fn(),
  cast: vi.fn(),
  getAccess: vi.fn(),
}));

vi.mock('@/features/participation/api/participation-api', () => ({
  participationApi: api,
  getParticipationErrorMessage: (
    _error: unknown,
    operation: 'load' | 'authenticate' | 'cast',
  ) => `${operation} 오류`,
}));

const voteId = '11111111-1111-4111-8111-111111111111';
const voteDetailId = '22222222-2222-4222-8222-222222222222';
const candidateId = '33333333-3333-4333-8333-333333333333';
const electorId = '55555555-5555-4555-8555-555555555555';

const access = {
  ballots: [
    {
      candidates: [
        {
          candidateNo: 1,
          description: '',
          id: candidateId,
          name: '김후보',
        },
      ],
      description: '',
      id: voteDetailId,
      participated: false,
      sortOrder: 1,
      status: 'OPEN' as const,
      title: '회장 선출',
      type: 'CANDIDATE' as const,
    },
  ],
  elector: { identityVerified: false, label: '로그인 사용자' },
  vote: {
    description: '안내',
    endedAt: '2026-09-07T00:00:00.000Z',
    id: voteId,
    identityVerificationRequired: false,
    startedAt: '2026-09-06T00:00:00.000Z',
    status: 'OPEN' as const,
    title: '대표 선출',
    votingChannels: ['ONLINE' as const],
  },
};

function renderContainer(
  props: Partial<React.ComponentProps<typeof ParticipationContainer>> = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ParticipationContainer
        electorId={electorId}
        electorLabel="로그인 사용자"
        voteId={voteId}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe('ParticipationContainer', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_VOTE_API_MODE', 'live');
    api.getAccess.mockResolvedValue(access);
    api.authenticate.mockResolvedValue({
      electorId,
      identityVerified: true,
      voteId,
    });
    api.cast.mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      status: 'CAST',
      voteDetailId,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('blocks malformed identifiers before any API request', () => {
    renderContainer({ electorId: 'not-an-id' });

    expect(screen.getByText(/식별자가 올바르지 않습니다/)).toBeTruthy();
    expect(api.getAccess).not.toHaveBeenCalled();
  });

  it('verifies the elector and submits exactly one selected child ballot', async () => {
    renderContainer();

    expect(
      await screen.findByRole('heading', { name: '대표 선출' }),
    ).toBeTruthy();
    expect(screen.getByRole('radio', { name: /김후보/ })).toHaveProperty(
      'disabled',
      true,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mock 본인확인' }));
    expect(
      await screen.findByText(/이 브라우저 세션에서 Mock 확인을 마쳤습니다/),
    ).toBeTruthy();
    expect(api.authenticate.mock.calls[0]?.[0]).toEqual({ electorId, voteId });

    fireEvent.click(screen.getByRole('radio', { name: /김후보/ }));
    fireEvent.click(screen.getByRole('button', { name: '선택 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '선택 확정' }));

    expect(
      await screen.findByText('이 항목의 투표가 안전하게 기록되었습니다.'),
    ).toBeTruthy();
    expect(api.cast).toHaveBeenCalledTimes(1);
    expect(api.cast.mock.calls[0]?.[0]).toEqual({
      electorId,
      selectedCandidateId: candidateId,
      voteDetailId,
      voteId,
    });
  });

  it('does not unlock ballots when HTTP success carries identityVerified false', async () => {
    api.authenticate.mockResolvedValueOnce({
      electorId,
      identityVerified: false,
      voteId,
    });
    renderContainer();

    await screen.findByRole('heading', { name: '대표 선출' });
    fireEvent.click(screen.getByRole('button', { name: 'Mock 본인확인' }));

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Mock 본인확인 결과가 실패',
    );
    expect(screen.getByRole('radio', { name: /김후보/ })).toHaveProperty(
      'disabled',
      true,
    );
  });
});
