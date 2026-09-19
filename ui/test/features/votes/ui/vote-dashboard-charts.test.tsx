/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { VoteDashboardCharts } from '@/features/votes/ui/vote-dashboard-charts';
import type { VoteDashboardMetrics, VoteSummary } from '@/features/votes/model/vote.types';

const metrics: VoteDashboardMetrics = {
  activeVotes: 2,
  scheduledVotes: 1,
  completedVotes: 1,
  averageParticipationRate: '42%',
};

const activeVotes: VoteSummary[] = [
  {
    id: 'known',
    title: '참여 중인 선거',
    status: 'active',
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: '2026-09-30T00:00:00.000Z',
    electorCount: 10,
    participatedCount: 3,
    participationKnown: true,
  },
  {
    id: 'unknown',
    title: '집계 전 선거',
    status: 'active',
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: '2026-09-30T00:00:00.000Z',
    electorCount: 5,
    participatedCount: 0,
    participationKnown: false,
  },
];

afterEach(cleanup);

describe('dashboard charts', () => {
  it('visualizes stage counts and labels unknown participation without showing zero percent', () => {
    render(<VoteDashboardCharts metrics={metrics} activeVotes={activeVotes} />);

    expect(screen.getByRole('heading', { name: '운영 단계 분포' })).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('2개')).toBeTruthy();
    expect(screen.getAllByText('1개')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: '진행 중 투표 참여율' })).toBeTruthy();
    expect(screen.getByText('30%')).toBeTruthy();
    expect(screen.getByText('집계된 투표 평균 참여율')).toBeTruthy();
    expect(screen.getByText('42%')).toBeTruthy();
    expect(screen.getByText('집계 전')).toBeTruthy();
    expect(screen.queryByText('0%')).toBeNull();
    expect(screen.getByRole('link', { name: '참여 중인 선거' }).getAttribute('href'))
      .toBe('/votes/known');
    expect(screen.getByText(/3 \/ 10명 참여 · 확인 필요/)).toBeTruthy();
  });

  it('explains empty charts instead of presenting missing votes as activity', () => {
    render(
      <VoteDashboardCharts
        metrics={{ ...metrics, activeVotes: 0, scheduledVotes: 0, completedVotes: 0 }}
        activeVotes={[]}
      />,
    );

    expect(screen.getByText('표시할 운영 단계 데이터가 없습니다.')).toBeTruthy();
    expect(
      screen.getByText('진행 중인 투표가 없어 참여율을 표시할 수 없습니다.'),
    ).toBeTruthy();
  });
});
