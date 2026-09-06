/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ParticipationView } from '@/features/participation/ui/participation-view';
import type { ParticipationAccess } from '@/features/participation/model/participation.types';

const access: ParticipationAccess = {
  vote: { id: 'vote-1', title: '대표 선출', description: '안내', status: 'OPEN', startedAt: '2026-09-05T00:00:00.000Z', endedAt: '2026-09-06T00:00:00.000Z', identityVerificationRequired: false },
  elector: { label: '선거인 101', status: 'ELIGIBLE', identityVerified: false },
  expiresAt: '2026-09-06T00:00:00.000Z',
  ballots: [{ id: 'detail-1', title: '회장', description: '', type: 'CANDIDATE', status: 'OPEN', sortOrder: 1, participated: false, candidates: [{ id: 'candidate-1', candidateNo: 1, name: '김후보', description: '' }] }],
};

describe('ParticipationView', () => {
  afterEach(cleanup);

  it('requires an explicit confirmation before casting', () => {
    const onCast = vi.fn().mockResolvedValue(undefined);
    render(<ParticipationView state={{ kind: 'ready', access, token: 'token' }} onCast={onCast} />);

    fireEvent.click(screen.getByRole('radio', { name: /김후보/ }));
    fireEvent.click(screen.getByRole('button', { name: '선택 확인' }));
    expect(onCast).not.toHaveBeenCalled();
    expect(screen.getByText(/제출 후에는 선택을 변경할 수 없습니다/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '선택 확정' }));
    expect(onCast).toHaveBeenCalledWith('detail-1', 'candidate-1');
  });

  it('disables voting when identity verification is required but incomplete', () => {
    render(<ParticipationView state={{ kind: 'ready', access: { ...access, vote: { ...access.vote, identityVerificationRequired: true } }, token: 'token' }} onCast={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('본인인증이 완료되어야');
    expect(screen.getByRole('radio', { name: /김후보/ })).toHaveProperty('disabled', true);
  });
});
