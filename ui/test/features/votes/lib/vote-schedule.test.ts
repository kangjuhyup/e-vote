import { describe, expect, it } from 'vitest';

import {
  resolveVoteSchedule,
  toDateTimeLocalValue,
  VOTE_SCHEDULE_FUTURE_MESSAGE,
  VOTE_SCHEDULE_ORDER_MESSAGE,
  VOTE_SCHEDULE_REQUIRED_MESSAGE,
} from '@/features/votes/lib/vote-schedule';

describe('vote schedule', () => {
  it('requires both schedule boundaries', () => {
    expect(resolveVoteSchedule('', '2026-09-10T10:00')).toEqual({
      errorMessage: VOTE_SCHEDULE_REQUIRED_MESSAGE,
      ok: false,
    });
  });

  it('requires the end to be later than the start', () => {
    expect(
      resolveVoteSchedule(
        '2026-09-10T10:00',
        '2026-09-10T10:00',
        new Date('2026-09-06T00:00:00'),
      ),
    ).toEqual({
      errorMessage: VOTE_SCHEDULE_ORDER_MESSAGE,
      ok: false,
    });
  });

  it('requires the start to be later than the current time', () => {
    expect(
      resolveVoteSchedule(
        '2026-09-06T10:00',
        '2026-09-06T12:00',
        new Date('2026-09-06T10:00:00'),
      ),
    ).toEqual({
      errorMessage: VOTE_SCHEDULE_FUTURE_MESSAGE,
      ok: false,
    });
  });

  it('converts local form values to explicit ISO timestamps', () => {
    const result = resolveVoteSchedule(
      '2026-09-10T10:00:00',
      '2026-09-10T12:00:00',
      new Date('2026-09-06T00:00:00'),
    );

    expect(result).toEqual({
      ok: true,
      schedule: {
        startedAt: new Date('2026-09-10T10:00:00').toISOString(),
        endedAt: new Date('2026-09-10T12:00:00').toISOString(),
      },
    });
  });

  it('formats API timestamps for datetime-local inputs', () => {
    const isoValue = '2026-09-10T01:02:03.000Z';
    const localValue = toDateTimeLocalValue(isoValue);

    expect(new Date(localValue).toISOString()).toBe(isoValue);
  });
});
