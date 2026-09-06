/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('lottie-react', () => ({
  LottieSvg: ({ autoplay, loop }: { autoplay?: boolean; loop?: boolean }) => (
    <div
      data-autoplay={String(autoplay)}
      data-loop={String(loop)}
      data-testid="lottie-player"
    />
  ),
}));

import { ParticipationCompletion } from '@/features/participation/ui/participation-completion';

describe('ParticipationCompletion', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the ballot-box completion state for a submitted vote', () => {
    render(<ParticipationCompletion />);

    expect(screen.getByRole('heading', { name: '투표가 완료되었습니다' })).toBeTruthy();
    expect(screen.getByText(/투표용지가 안전하게 투표함에 들어갔습니다/)).toBeTruthy();
    expect(
      document
        .querySelector('[data-slot="completion-animation"]')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(screen.getByTestId('lottie-player').getAttribute('data-autoplay')).toBe(
      'true',
    );
    expect(screen.getByTestId('lottie-player').getAttribute('data-loop')).toBe(
      'false',
    );
  });
});
