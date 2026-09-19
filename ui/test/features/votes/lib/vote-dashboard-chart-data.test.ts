import { describe, expect, it } from 'vitest';

import { getDashboardParticipationRows } from '@/features/votes/lib/vote-dashboard-chart-data';
import type { VoteSummary } from '@/features/votes/model/vote.types';

function vote(
  id: string,
  participatedCount: number,
  participationKnown = true,
): VoteSummary {
  return {
    id,
    title: id,
    status: 'active',
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: '2026-09-30T00:00:00.000Z',
    electorCount: 10,
    participatedCount,
    participationKnown,
  };
}

describe('dashboard participation chart', () => {
  it('shows the five lowest known participation rates before uncounted votes', () => {
    const rows = getDashboardParticipationRows([
      vote('60%', 6),
      vote('unknown', 0, false),
      vote('20%', 2),
      vote('90%', 9),
      vote('40%', 4),
      vote('10%', 1),
      vote('80%', 8),
    ]);

    expect(rows.map((row) => row.id)).toEqual(['10%', '20%', '40%', '60%', '80%']);
    expect(rows.map((row) => row.percent)).toEqual([10, 20, 40, 60, 80]);
  });

  it('keeps unknown participation distinct from zero participation', () => {
    expect(
      getDashboardParticipationRows([
        vote('unknown', 0, false),
        vote('zero', 0),
      ]).map((row) => [row.id, row.percent]),
    ).toEqual([
      ['zero', 0],
      ['unknown', null],
    ]);
  });
});
