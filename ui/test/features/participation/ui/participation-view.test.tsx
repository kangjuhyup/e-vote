/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ParticipationAccess } from '@/features/participation/model/participation.types';
import { ParticipationView } from '@/features/participation/ui/participation-view';

const access: ParticipationAccess = {
  vote: {
    id: '11111111-1111-4111-8111-111111111111',
    title: '대표 선출',
    description: '안내',
    status: 'OPEN',
    startedAt: '2026-09-05T00:00:00.000Z',
    endedAt: '2026-09-06T00:00:00.000Z',
    identityVerificationRequired: false,
    votingChannels: ['ONLINE'],
  },
  elector: { label: '로그인 사용자', identityVerified: true },
  ballots: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      title: '회장',
      description: '',
      type: 'CANDIDATE',
      status: 'OPEN',
      sortOrder: 1,
      participated: false,
      candidates: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          candidateNo: 1,
          name: '김후보',
          description: '',
        },
      ],
    },
  ],
};

function renderView(
  overrides: Partial<React.ComponentProps<typeof ParticipationView>> = {},
) {
  const props: React.ComponentProps<typeof ParticipationView> = {
    electorIdentityState: 'verified',
    onAuthenticate: vi.fn().mockResolvedValue(undefined),
    onCast: vi.fn().mockResolvedValue(undefined),
    state: { kind: 'ready', access },
    ...overrides,
  };
  render(<ParticipationView {...props} />);
  return props;
}

describe('ParticipationView', () => {
  afterEach(cleanup);

  it('requires an explicit confirmation before casting', () => {
    const onCast = vi.fn().mockResolvedValue(undefined);
    renderView({ onCast });

    fireEvent.click(screen.getByRole('radio', { name: /김후보/ }));
    fireEvent.click(screen.getByRole('button', { name: '선택 확인' }));
    expect(onCast).not.toHaveBeenCalled();
    expect(
      screen.getByText(/제출 후에는 선택을 변경할 수 없습니다/),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '선택 확정' }));
    expect(onCast).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
    );
  });

  it('requires account-to-elector Mock verification even when vote policy is optional', () => {
    const onAuthenticate = vi.fn().mockResolvedValue(undefined);
    renderView({
      electorIdentityState: 'unverified',
      onAuthenticate,
      state: {
        kind: 'ready',
        access: {
          ...access,
          elector: { ...access.elector, identityVerified: false },
        },
      },
    });

    expect(
      screen.getByText('개발용 Mock 본인확인', { selector: 'h2' }),
    ).toBeTruthy();
    expect(screen.getByText(/실제 PASS 또는 SMS 본인인증이 아닙니다/)).toBeTruthy();
    expect(screen.getByRole('radio', { name: /김후보/ })).toHaveProperty(
      'disabled',
      true,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mock 본인확인' }));
    expect(onAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('shows a cast conflict as an accessible error without completing the ballot', () => {
    renderView({
      errorMessage:
        '이미 참여했습니다. 중복 제출은 완료로 처리되지 않습니다.',
    });

    expect(screen.getByRole('alert').textContent).toContain(
      '완료로 처리되지 않습니다',
    );
    expect(screen.queryByText('이 항목의 투표가 안전하게 기록되었습니다.')).toBeNull();
  });
});
