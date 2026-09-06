/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VoteApiError } from '@/shared/api/vote-api-error';
import { ParticipationContainer } from '@/features/participation/container/participation-container';

const api = vi.hoisted(() => ({
  authenticate: vi.fn(),
  cast: vi.fn(),
  getAccess: vi.fn(),
  uploadSignature: vi.fn(),
}));
const previewApi = vi.hoisted(() => ({
  authenticate: vi.fn(),
  cast: vi.fn(),
  getAccess: vi.fn(),
  uploadSignature: vi.fn(),
}));

vi.mock('@/features/participation/api/participation-api', () => ({
  participationApi: api,
  participationPreviewApi: previewApi,
  getParticipationErrorMessage: (
    _error: unknown,
    operation: 'load' | 'authenticate' | 'cast',
  ) => `${operation} 오류`,
}));

const voteId = '11111111-1111-4111-8111-111111111111';
const voteDetailId = '22222222-2222-4222-8222-222222222222';
const candidateId = '33333333-3333-4333-8333-333333333333';
const electorId = '55555555-5555-4555-8555-555555555555';

vi.mock('lottie-react', () => ({ LottieSvg: () => null }));

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

vi.mock('@/components/forms/signature-pad', () => ({
  SignaturePad: ({
    onChange,
    disabled,
  }: {
    onChange: (file: File) => void;
    disabled: boolean;
  }) => (
    <button
      disabled={disabled}
      onClick={() =>
        onChange(new File(['ink'], 'signature.png', { type: 'image/png' }))
      }
    >
      서명 그리기
    </button>
  ),
}));

async function authenticate() {
  await screen.findByRole('heading', { name: '대표 선출' });
  fireEvent.click(screen.getByRole('button', { name: '본인확인으로 계속' }));
  fireEvent.click(screen.getByRole('button', { name: 'Mock 본인확인' }));
  await screen.findByText(/이 브라우저 세션에서 Mock 확인을 마쳤습니다/);
  expect(screen.queryByRole('button', { name: '투표 시작' })).toBeNull();
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
    '3',
  );
  expect(document.querySelector('[data-mobile-ballot="active"]')).toBeTruthy();
}

function selectBallot() {
  fireEvent.click(screen.getAllByRole('radio')[0]);
  fireEvent.click(screen.getAllByRole('button', { name: '선택 확인' })[0]);
  fireEvent.click(screen.getByRole('button', { name: '선택 저장' }));
}

function drawSignature() {
  fireEvent.click(screen.getByRole('button', { name: '서명 그리기' }));
}

describe('ParticipationContainer', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.stubEnv('NEXT_PUBLIC_VOTE_API_MODE', 'live');
    api.uploadSignature.mockResolvedValue({
      fileId: 'signature',
      storageKey: 'signatures/test',
    });
    previewApi.uploadSignature.mockResolvedValue({
      fileId: 'preview-signature',
      storageKey: 'preview/test',
    });
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
    previewApi.getAccess.mockResolvedValue(access);
    previewApi.authenticate.mockResolvedValue({
      electorId,
      identityVerified: true,
      voteId,
    });
    previewApi.cast.mockResolvedValue({
      id: '77777777-7777-4777-8777-777777777777',
      status: 'CAST',
      voteDetailId,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('blocks malformed identifiers before any API request', () => {
    renderContainer({ electorId: 'not-an-id' });

    expect(screen.getByText(/식별자가 올바르지 않습니다/)).toBeTruthy();
    expect(api.getAccess).not.toHaveBeenCalled();
  });

  it('keeps selections local until the final handwritten signature is confirmed', async () => {
    renderContainer();
    await screen.findByRole('heading', { name: '대표 선출' });
    expect(screen.getByRole('radio')).toHaveProperty('disabled', true);
    await authenticate();
    expect(screen.queryByText('투표 참여 서명')).toBeNull();
    selectBallot();
    expect(screen.getByText('투표 참여 서명')).toBeTruthy();
    expect(api.cast).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '결과 제출' })).toHaveProperty(
      'disabled',
      true,
    );
    drawSignature();
    expect(api.cast).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));
    await screen.findByText('이 항목의 투표가 안전하게 기록되었습니다.');
    expect(api.cast).toHaveBeenCalledTimes(1);
    expect(api.uploadSignature.mock.invocationCallOrder[0]).toBeLessThan(
      api.cast.mock.invocationCallOrder[0],
    );
    expect(api.cast.mock.calls[0][0]).toEqual({
      electorId,
      voteId,
      voteDetailId,
      selectedCandidateId: candidateId,
      votingChannel: 'ONLINE',
    });
  });

  it.each(['ONLINE', 'ONSITE', 'VISIT'] as const)(
    'submits the signature before participation in %s, with retry and duplicate-click protection',
    async (votingChannel) => {
      api.getAccess.mockResolvedValue({
        ...access,
        vote: { ...access.vote, votingChannels: [votingChannel] },
      });
      let complete!: (value: { fileId: string; storageKey: string }) => void;
      api.uploadSignature
        .mockRejectedValueOnce(new Error('confirm failed'))
        .mockImplementationOnce((input) => {
          input.onStage('confirming');
          return new Promise((resolve) => {
            complete = resolve;
          });
        });
      renderContainer({ votingChannel });
      await authenticate();
      selectBallot();
      drawSignature();
      expect(screen.queryByRole('button', { name: '서명 확정' })).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));
      await screen.findByRole('alert');
      expect(api.cast).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));
      await screen.findByText('서명 확정 중…');
      const submitting = screen.getByRole('button', { name: '제출 중…' });
      expect(submitting).toHaveProperty('disabled', true);
      fireEvent.click(submitting);
      expect(api.uploadSignature).toHaveBeenCalledTimes(2);
      expect(api.cast).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: '서명 그리기' }),
      ).toHaveProperty('disabled', true);
      expect(api.uploadSignature.mock.calls[1][0].blob).toBe(
        api.uploadSignature.mock.calls[0][0].blob,
      );
      await act(async () => complete({ fileId: 'file', storageKey: 'key' }));
      await screen.findByText('이 항목의 투표가 안전하게 기록되었습니다.');
      expect(api.cast).toHaveBeenCalledTimes(1);
      expect(api.cast.mock.calls[0][0].votingChannel).toBe(votingChannel);
    },
  );

  it('reconfirms the signature on retry after a 409 without losing the selection', async () => {
    api.cast.mockRejectedValueOnce(new VoteApiError('Signature required', 409));
    renderContainer();
    await authenticate();
    selectBallot();
    drawSignature();
    fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));
    await screen.findByRole('alert');
    expect(
      screen.queryByText('이 항목의 투표가 안전하게 기록되었습니다.'),
    ).toBeNull();
    expect(screen.getByRole('button', { name: '결과 제출' })).toHaveProperty(
      'disabled',
      false,
    );
    expect(screen.getByText('회장 선출: 김후보')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));
    await screen.findByText('이 항목의 투표가 안전하게 기록되었습니다.');
    expect(api.uploadSignature).toHaveBeenCalledTimes(2);
  });

  it('retries only the unsubmitted ballot after a partial submission failure', async () => {
    api.getAccess.mockResolvedValue({
      ...access,
      ballots: [
        access.ballots[0],
        { ...access.ballots[0], id: 'second-ballot', title: '감사 선출' },
      ],
    });
    api.cast
      .mockResolvedValueOnce({ id: 'first', status: 'CAST', voteDetailId })
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        id: 'second',
        status: 'CAST',
        voteDetailId: 'second-ballot',
      });
    renderContainer();
    await authenticate();
    selectBallot();
    const secondBallot = screen
      .getByRole('heading', { name: '감사 선출' })
      .closest('[data-mobile-ballot]') as HTMLElement;
    fireEvent.click(within(secondBallot).getByRole('radio'));
    fireEvent.click(
      within(secondBallot).getByRole('button', { name: '선택 확인' }),
    );
    fireEvent.click(screen.getByRole('button', { name: '선택 저장' }));
    drawSignature();
    fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));
    await screen.findByRole('alert');
    expect(api.cast).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));
    await screen.findByRole('heading', { name: '투표가 완료되었습니다' });
    expect(api.uploadSignature).toHaveBeenCalledTimes(1);
    expect(api.cast.mock.calls.map(([input]) => input.voteDetailId)).toEqual([
      voteDetailId,
      'second-ballot',
      'second-ballot',
    ]);
  });

  it('does not reuse a confirmed signature after switching the elector', async () => {
    api.cast.mockRejectedValueOnce(new Error('temporary failure'));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const subject = (id: string) => (
      <QueryClientProvider client={queryClient}>
        <ParticipationContainer
          voteId={voteId}
          electorId={id}
          electorLabel="선거인"
        />
      </QueryClientProvider>
    );
    const view = render(subject(electorId));
    await authenticate();
    selectBallot();
    drawSignature();
    fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));
    await screen.findByRole('alert');
    view.rerender(subject('88888888-8888-4888-8888-888888888888'));
    await authenticate();
    selectBallot();
    expect(screen.queryByText('서명 확정 완료')).toBeNull();
    expect(screen.getByRole('button', { name: '결과 제출' })).toHaveProperty(
      'disabled',
      true,
    );
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
    expect(screen.getByRole('radio')).toHaveProperty('disabled', true);
  });

  it('uses only the preview client for the final signature and submission', async () => {
    renderContainer({
      electorId: undefined,
      previewMode: true,
      voteId: undefined,
    });
    await authenticate();
    selectBallot();
    drawSignature();
    fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));
    await screen.findByText('이 항목의 투표가 안전하게 기록되었습니다.');
    expect(previewApi.cast).toHaveBeenCalledTimes(1);
    expect(api.cast).not.toHaveBeenCalled();
    expect(api.uploadSignature).not.toHaveBeenCalled();
  });
});
