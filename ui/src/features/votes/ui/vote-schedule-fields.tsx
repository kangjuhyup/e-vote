import { ArrowRight, CalendarDays, Clock3, WandSparkles } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  toDateTimeLocalValue,
  VOTE_SCHEDULE_FUTURE_MESSAGE,
} from '@/features/votes/lib/vote-schedule';

interface VoteScheduleFieldsProps {
  defaultEndedAt?: string;
  defaultStartedAt?: string;
  descriptionId: string;
  disabled?: boolean;
}

const durationOptions = [
  { label: '1시간', milliseconds: 60 * 60 * 1_000 },
  { label: '1일', milliseconds: 24 * 60 * 60 * 1_000 },
  { label: '3일', milliseconds: 3 * 24 * 60 * 60 * 1_000 },
  { label: '7일', milliseconds: 7 * 24 * 60 * 60 * 1_000 },
] as const;

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? '00' : '30';
  return `${String(hours).padStart(2, '0')}:${minutes}`;
});

export function VoteScheduleFields({
  defaultEndedAt,
  defaultStartedAt,
  descriptionId,
  disabled = false,
}: VoteScheduleFieldsProps) {
  const fieldId = useId();
  const [openedAt] = useState(() => Date.now());
  const earliestStart = getNextTimeSlot(openedAt);
  const initialStart = splitDateTime(defaultStartedAt);
  const initialEnd = splitDateTime(defaultEndedAt);
  const [startDate, setStartDate] = useState(
    initialStart.date || earliestStart.date,
  );
  const [startTime, setStartTime] = useState(
    initialStart.time || earliestStart.time,
  );
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [endTime, setEndTime] = useState(initialEnd.time);

  const startedAt = joinDateTime(startDate, startTime);
  const endedAt = joinDateTime(endDate, endTime);
  const minimumEndDate = laterDate(startDate, earliestStart.date);
  const summary = useMemo(
    () => getScheduleSummary(startedAt, endedAt, openedAt),
    [endedAt, openedAt, startedAt],
  );

  function applyDuration(milliseconds: number) {
    const start = new Date(startedAt);
    if (!startedAt || !Number.isFinite(start.getTime())) return;

    const nextEnd = splitDateTime(
      new Date(start.getTime() + milliseconds).toISOString(),
    );
    setEndDate(nextEnd.date);
    setEndTime(nextEnd.time);
  }

  return (
    <fieldset
      className="space-y-4 rounded-lg border bg-muted/20 p-4 sm:col-span-2 sm:p-5"
      disabled={disabled}
      aria-describedby={descriptionId}
    >
      <legend className="sr-only">투표 기간</legend>
      <input type="hidden" name="startedAt" value={startedAt} />
      <input type="hidden" name="endedAt" value={endedAt} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <CalendarDays className="size-4 text-primary" aria-hidden="true" />
            투표 기간
          </div>
          <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
            결제 완료 후 지정한 시각에 자동으로 개시하고 마감합니다.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden="true" />
          현재 기기 시간 기준
        </span>
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <SchedulePoint
          accent="start"
          date={startDate}
          dateId={`${fieldId}-start-date`}
          dateLabel="투표 시작 날짜"
          label="시작"
          minimumDate={earliestStart.date}
          onDateChange={setStartDate}
          onTimeChange={setStartTime}
          time={startTime}
          timeId={`${fieldId}-start-time`}
          timeLabel="투표 시작 시간"
          isTimeDisabled={(option) =>
            isBefore(joinDateTime(startDate, option), earliestStart.dateTime)
          }
        />
        <div className="hidden items-center text-muted-foreground lg:flex">
          <ArrowRight className="size-5" aria-hidden="true" />
        </div>
        <SchedulePoint
          accent="end"
          date={endDate}
          dateId={`${fieldId}-end-date`}
          dateLabel="투표 종료 날짜"
          label="종료"
          minimumDate={minimumEndDate}
          onDateChange={setEndDate}
          onTimeChange={setEndTime}
          time={endTime}
          timeId={`${fieldId}-end-time`}
          timeLabel="투표 종료 시간"
          isTimeDisabled={(option) => {
            const optionDateTime = joinDateTime(endDate, option);
            return (
              isBefore(optionDateTime, earliestStart.dateTime) ||
              (startedAt ? !isAfter(optionDateTime, startedAt) : false)
            );
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <WandSparkles className="size-3.5" aria-hidden="true" />
          시작부터
        </span>
        {durationOptions.map((option) => (
          <Button
            key={option.label}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || !startedAt}
            onClick={() => applyDuration(option.milliseconds)}
            aria-label={`시작 시각부터 ${option.label} 뒤에 종료`}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <p
        className={`rounded-md px-3 py-2 text-sm ${
          summary.valid
            ? 'bg-primary/8 text-foreground'
            : 'bg-background text-muted-foreground'
        }`}
        aria-live="polite"
      >
        {summary.message}
      </p>
    </fieldset>
  );
}

function SchedulePoint({
  accent,
  date,
  dateId,
  dateLabel,
  isTimeDisabled,
  label,
  minimumDate,
  onDateChange,
  onTimeChange,
  time,
  timeId,
  timeLabel,
}: {
  accent: 'end' | 'start';
  date: string;
  dateId: string;
  dateLabel: string;
  isTimeDisabled: (time: string) => boolean;
  label: string;
  minimumDate: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  time: string;
  timeId: string;
  timeLabel: string;
}) {
  return (
    <div className="rounded-md border bg-background p-3 shadow-xs">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${
            accent === 'start' ? 'bg-primary' : 'bg-foreground'
          }`}
          aria-hidden="true"
        />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
        <label htmlFor={dateId} className="sr-only">
          {dateLabel}
        </label>
        <Input
          id={dateId}
          type="date"
          min={minimumDate}
          value={date}
          required
          onChange={(event) => onDateChange(event.target.value)}
          aria-label={dateLabel}
        />
        <label htmlFor={timeId} className="sr-only">
          {timeLabel}
        </label>
        <Select
          id={timeId}
          value={time}
          required
          onChange={(event) => onTimeChange(event.target.value)}
          aria-label={timeLabel}
        >
          <option value="" disabled>
            시간 선택
          </option>
          {time && !timeOptions.includes(time) ? (
            <option value={time} disabled={isTimeDisabled(time)}>
              {time} (기존)
            </option>
          ) : null}
          {timeOptions.map((option) => (
            <option
              key={option}
              value={option}
              disabled={isTimeDisabled(option)}
            >
              {option}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function splitDateTime(value?: string) {
  const localValue = value ? toDateTimeLocalValue(value) : '';
  const [date = '', timeWithSeconds = ''] = localValue.split('T');
  return { date, time: timeWithSeconds.slice(0, 5) };
}

function joinDateTime(date: string, time: string) {
  return date && time ? `${date}T${time}:00` : '';
}

function getScheduleSummary(
  startedAt: string,
  endedAt: string,
  now: number,
) {
  if (!startedAt) {
    return {
      message: '시작 날짜와 시간, 종료 날짜와 시간을 선택하세요.',
      valid: false,
    };
  }

  if (!endedAt) {
    return {
      message: '종료 날짜와 시간을 선택하거나 빠른 종료 설정을 사용하세요.',
      valid: false,
    };
  }

  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (Number.isFinite(start.getTime()) && start.getTime() <= now) {
    return { message: VOTE_SCHEDULE_FUTURE_MESSAGE, valid: false };
  }
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  ) {
    return {
      message: '종료 시각은 시작 시각보다 이후여야 합니다.',
      valid: false,
    };
  }

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const duration = formatDuration(end.getTime() - start.getTime());
  return {
    message: `${formatter.format(start)}부터 ${formatter.format(end)}까지 · ${duration}`,
    valid: true,
  };
}

function getNextTimeSlot(now: number) {
  const slotMilliseconds = 30 * 60 * 1_000;
  const date = new Date(Math.ceil((now + 1) / slotMilliseconds) * slotMilliseconds);
  const dateTime = toDateTimeLocalValue(date.toISOString()).slice(0, 16);
  const [dateValue, time = ''] = dateTime.split('T');
  return { date: dateValue, dateTime: `${dateTime}:00`, time };
}

function laterDate(first: string, second: string) {
  if (!first) return second;
  return first > second ? first : second;
}

function isBefore(candidate: string, minimum: string) {
  if (!candidate) return false;
  return new Date(candidate).getTime() < new Date(minimum).getTime();
}

function isAfter(candidate: string, minimum: string) {
  if (!candidate) return false;
  return new Date(candidate).getTime() > new Date(minimum).getTime();
}

function formatDuration(milliseconds: number) {
  const totalMinutes = Math.round(milliseconds / (60 * 1_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days > 0 ? `${days}일` : '',
    hours > 0 ? `${hours}시간` : '',
    minutes > 0 ? `${minutes}분` : '',
  ].filter(Boolean);
  return parts.join(' ') || '0분';
}
