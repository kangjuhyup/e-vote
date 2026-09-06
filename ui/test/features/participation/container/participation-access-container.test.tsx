/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  exchange: vi.fn(),
  getAccess: vi.fn(),
  getResult: vi.fn(),
  participate: vi.fn(),
  uploadSignature: vi.fn(),
}));

vi.mock('@/features/participation/api/participation-access-api', () => ({
  consumeParticipationAccessToken: (location: Location, history: History) => {
    const token = new URLSearchParams(location.hash.slice(1)).get('access_token');
    history.replaceState(history.state, '', `${location.pathname}${location.search}`);
    return token;
  },
  getParticipationAccessErrorMessage: () => '참여 오류',
  participationAccessApi: api,
  participationAccessPreviewApi: api,
}));

vi.mock('@/components/forms/signature-pad', () => ({
  SignaturePad: ({ onChange }: { onChange: (file: File) => void }) => (
    <button type="button" onClick={() => onChange(new File(['ink'], 'signature.png', { type: 'image/png' }))}>
      서명 그리기
    </button>
  ),
}));
vi.mock('lottie-react', () => ({ LottieSvg: () => null }));

import { ParticipationAccessContainer } from '@/features/participation/container/participation-access-container';

const session = {
  csrfToken: 'csrf-token',
  hasConfirmedSignature: false,
  permittedActions: { participate: true, readResults: false, uploadSignature: true },
  scope: 'PARTICIPATE' as const,
  vote: {
    description: '', endedAt: '2026-09-07T10:00:00.000Z', id: 'vote', startedAt: '2026-09-06T10:00:00.000Z', status: 'OPEN' as const, title: '대표 선출',
  },
  voteDetails: [{
    candidates: [{ candidateNo: 1, description: '', id: 'candidate', name: '김후보' }],
    description: '', id: 'detail', participated: false, sortOrder: 1, status: 'OPEN' as const, title: '회장 선출', type: 'CANDIDATE' as const,
  }],
};

describe('ParticipationAccessContainer', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/participate#access_token=signed-token');
    api.exchange.mockResolvedValue(session);
    api.getAccess.mockResolvedValue(session);
    api.uploadSignature.mockResolvedValue({ fileId: 'file', storageKey: 'key' });
    api.participate.mockResolvedValue({ id: 'cast', status: 'CAST', voteDetailId: 'detail' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('removes the fragment, exchanges once, and confirms the signature before casting', async () => {
    render(<ParticipationAccessContainer />);
    await screen.findByRole('heading', { name: '대표 선출' });
    expect(window.location.hash).toBe('');
    expect(api.exchange).toHaveBeenCalledWith('signed-token');

    fireEvent.click(screen.getByRole('button', { name: '투표 시작' }));
    fireEvent.click(screen.getByRole('radio'));
    fireEvent.click(screen.getByRole('button', { name: '선택 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '선택 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '서명 그리기' }));
    fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));

    await screen.findByText('이 항목의 투표가 안전하게 기록되었습니다.');
    expect(api.uploadSignature.mock.invocationCallOrder[0]).toBeLessThan(api.participate.mock.invocationCallOrder[0]);
    expect(api.participate).toHaveBeenCalledWith({
      csrfToken: 'csrf-token',
      selectedCandidateId: 'candidate',
      voteDetailId: 'detail',
    });
  });

  it('shows only aggregate result access for a closed vote', async () => {
    api.getAccess.mockResolvedValue({
      ...session,
      csrfToken: undefined,
      permittedActions: { participate: false, readResults: true, uploadSignature: false },
      scope: 'RESULT_READ',
      vote: { ...session.vote, status: 'CLOSED' },
    });
    api.getResult.mockResolvedValue({
      candidates: [], participantCount: 3, participatedVoteWeight: 3, participationUnit: 'INDIVIDUAL', privacyMode: 'SECRET', totalVoteCount: 3, totalWeightedVoteCount: 3, voteDetailId: 'detail', voteWeightMode: 'EQUAL', votingChannels: [],
    });
    render(<ParticipationAccessContainer />);
    expect(await screen.findByText('결과 열람 전용')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '결과 보기' }));
    await waitFor(() => expect(api.getResult).toHaveBeenCalledWith('detail'));
    expect(api.uploadSignature).not.toHaveBeenCalled();
    expect(api.participate).not.toHaveBeenCalled();
  });
});
