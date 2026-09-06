/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VoteScheduleFields } from '@/features/votes/ui/vote-schedule-fields';

describe('VoteScheduleFields', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('allows only future 30-minute slots and an end after the start', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T14:12:00'));

    render(
      <form>
        <VoteScheduleFields descriptionId="schedule-description" />
      </form>,
    );

    const startDate = screen.getByLabelText('투표 시작 날짜');
    const startTime = screen.getByLabelText(
      '투표 시작 시간',
    ) as HTMLSelectElement;
    expect(startDate).toHaveProperty('min', '2026-09-06');
    expect(startDate).toHaveProperty('value', '2026-09-06');
    expect(startTime).toHaveProperty('value', '14:30');

    expect(startTime.querySelector('option[value="14:00"]')).toHaveProperty(
      'disabled',
      true,
    );
    expect(startTime.querySelector('option[value="14:30"]')).toHaveProperty(
      'disabled',
      false,
    );

    fireEvent.change(startTime, { target: { value: '14:30' } });
    fireEvent.change(screen.getByLabelText('투표 종료 날짜'), {
      target: { value: '2026-09-06' },
    });
    const endTime = screen.getByLabelText(
      '투표 종료 시간',
    ) as HTMLSelectElement;
    expect(endTime.querySelector('option[value="14:30"]')).toHaveProperty(
      'disabled',
      true,
    );
    expect(endTime.querySelector('option[value="15:00"]')).toHaveProperty(
      'disabled',
      false,
    );
  });
});
