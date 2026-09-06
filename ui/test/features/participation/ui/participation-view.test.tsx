/* @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ParticipationAccess } from '@/features/participation/model/participation.types';
import { ParticipationView } from '@/features/participation/ui/participation-view';

vi.mock('lottie-react', () => ({ LottieSvg: () => null }));

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
    hasSignature: true,
    onAuthenticate: vi.fn().mockResolvedValue(undefined),
    onSubmitResults: vi.fn().mockResolvedValue(undefined),
    state: { kind: 'ready', access },
    ...overrides,
  };
  render(<ParticipationView {...props} />);
  return props;
}

describe('ParticipationView', () => {
  afterEach(cleanup);

  it('requires an explicit confirmation before casting', () => {
    const onSubmitResults = vi.fn().mockResolvedValue(undefined);
    renderView({ onSubmitResults });
    expect(
      screen.queryByText('미리보기 환경입니다. 실제 투표에 반영되지 않습니다'),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '본인확인으로 계속' }));
    fireEvent.click(screen.getByRole('radio', { name: /김후보/ }));
    fireEvent.click(screen.getByRole('button', { name: '선택 확인' }));
    expect(onSubmitResults).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: '선택을 저장할까요?' });
    expect(dialog).toBeTruthy();
    expect(screen.getByText(/지금은 선택만 저장합니다/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '다시 선택' })).toBe(
      document.activeElement,
    );

    fireEvent.click(screen.getByRole('button', { name: '선택 저장' }));
    expect(onSubmitResults).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));
    expect(onSubmitResults).toHaveBeenCalledWith({
      '22222222-2222-4222-8222-222222222222':
        '33333333-3333-4333-8333-333333333333',
    });
  });

  it('closes the selection dialog with Escape and keeps the selected candidate', () => {
    renderView();

    fireEvent.click(screen.getByRole('button', { name: '본인확인으로 계속' }));
    const candidate = screen.getByRole('radio', { name: /김후보/ });
    fireEvent.click(candidate);
    fireEvent.click(screen.getByRole('button', { name: '선택 확인' }));

    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { bubbles: false, cancelable: true }),
    );

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(candidate).toHaveProperty('checked', true);
  });

  it('submits every ballot together only after all selections are saved', () => {
    const onSubmitResults = vi.fn();
    renderView({
      onSubmitResults,
      hasSignature: true,
      signatureContent: <div>직접 서명 단계</div>,
      state: {
        kind: 'ready',
        access: {
          ...access,
          ballots: [
            access.ballots[0],
            { ...access.ballots[0], id: 'second-ballot', title: '감사 선출' },
          ],
        },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '본인확인으로 계속' }));
    expect(screen.queryByText('직접 서명 단계')).toBeNull();
    for (let index = 0; index < 2; index += 1) {
      const ballot = document.querySelector(
        '[data-mobile-ballot="active"]',
      ) as HTMLElement;
      fireEvent.click(within(ballot).getByRole('radio'));
      fireEvent.click(
        within(ballot).getByRole('button', { name: '선택 확인' }),
      );
      fireEvent.click(screen.getByRole('button', { name: '선택 저장' }));
      if (index === 0) {
        expect(screen.queryByText('직접 서명 단계')).toBeNull();
        expect(screen.queryByRole('button', { name: '결과 제출' })).toBeNull();
      }
    }
    expect(screen.getByText('직접 서명 단계')).toBeTruthy();
    expect(screen.getByText('5 / 5 단계')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '결과 제출' }));
    expect(onSubmitResults).toHaveBeenCalledWith({
      '22222222-2222-4222-8222-222222222222':
        '33333333-3333-4333-8333-333333333333',
      'second-ballot': '33333333-3333-4333-8333-333333333333',
    });
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
    expect(
      screen.getByText(/실제 PASS 또는 SMS 본인인증이 아닙니다/),
    ).toBeTruthy();
    expect(screen.getByRole('radio', { name: /김후보/ })).toHaveProperty(
      'disabled',
      true,
    );

    fireEvent.click(screen.getByRole('button', { name: '본인확인으로 계속' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mock 본인확인' }));
    expect(onAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('shows a cast conflict as an accessible error without completing the ballot', () => {
    renderView({
      errorMessage: '이미 참여했습니다. 중복 제출은 완료로 처리되지 않습니다.',
    });

    expect(screen.getByRole('alert').textContent).toContain(
      '완료로 처리되지 않습니다',
    );
    expect(
      screen.queryByText('이 항목의 투표가 안전하게 기록되었습니다.'),
    ).toBeNull();
  });

  it('separates the mobile overview from verification and ballot steps', () => {
    renderView();

    const mobileProgress = screen.getByLabelText('모바일 투표 단계');
    expect(mobileProgress.className).toContain('lg:hidden');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '1',
    );
    expect(screen.getByText('1 / 4 단계')).toBeTruthy();

    const verificationSection = screen
      .getByText('개발용 Mock 본인확인', { selector: 'h2' })
      .closest('section');
    expect(verificationSection?.className).toContain('hidden');

    fireEvent.click(screen.getByRole('button', { name: '본인확인으로 계속' }));
    expect(verificationSection?.className).toContain('hidden');
    expect(screen.queryByRole('button', { name: '투표 시작' })).toBeNull();

    expect(screen.getByText('3 / 4 단계')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '3',
    );

    const desktopProgress = screen.getByText('항목 완료').closest('aside');
    expect(desktopProgress?.className).toContain('hidden');
    expect(desktopProgress?.className).toContain('lg:block');
    expect(
      screen.getByRole('button', { name: '선택 확인' }).className,
    ).toContain('min-h-11');
  });

  it('shows only the current ballot as active on mobile', () => {
    renderView({
      state: {
        kind: 'ready',
        access: {
          ...access,
          ballots: [
            access.ballots[0],
            {
              ...access.ballots[0],
              id: '44444444-4444-4444-8444-444444444444',
              title: '감사 선출',
            },
          ],
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: '본인확인으로 계속' }));
    const ballotPages = document.querySelectorAll('[data-mobile-ballot]');
    expect(ballotPages).toHaveLength(2);
    expect(ballotPages[0]?.getAttribute('data-mobile-ballot')).toBe('active');
    expect(ballotPages[1]?.getAttribute('data-mobile-ballot')).toBe('inactive');
    expect(ballotPages[1]?.className).toContain('hidden');
  });

  it('keeps preview guidance only in the top bar', () => {
    renderView({
      isPreview: true,
      state: {
        kind: 'ready',
        access: {
          ...access,
          ballots: [{ ...access.ballots[0], participated: true }],
        },
      },
    });

    expect(screen.getByText('화면 미리보기')).toBeTruthy();
    expect(
      screen
        .getByText('미리보기 환경입니다. 실제 투표에 반영되지 않습니다')
        .closest('header'),
    ).toBeTruthy();
    expect(screen.queryByText(/모든 미리보기 항목을 확인했습니다/)).toBeNull();
    expect(screen.queryByText(/미리보기에 반영했습니다/)).toBeNull();
    expect(screen.queryByText(/미리 확인합니다/)).toBeNull();
    expect(screen.getByText('투표가 완료되었습니다')).toBeTruthy();
  });
});
