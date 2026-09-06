export const VOTE_SCHEDULE_REQUIRED_MESSAGE =
  '투표 시작 시각과 종료 시각을 모두 입력하세요.';
export const VOTE_SCHEDULE_INVALID_MESSAGE =
  '올바른 투표 시작 시각과 종료 시각을 입력하세요.';
export const VOTE_SCHEDULE_FUTURE_MESSAGE =
  '투표 시작 시각은 현재 시각보다 이후여야 합니다.';
export const VOTE_SCHEDULE_ORDER_MESSAGE =
  '투표 종료 시각은 시작 시각보다 이후여야 합니다.';

export interface VoteSchedule {
  endedAt: string;
  startedAt: string;
}

export type VoteScheduleResult =
  | { ok: true; schedule: VoteSchedule }
  | { errorMessage: string; ok: false };

export function resolveVoteSchedule(
  startedAtInput: string,
  endedAtInput: string,
  now = new Date(),
): VoteScheduleResult {
  if (!startedAtInput.trim() || !endedAtInput.trim()) {
    return { errorMessage: VOTE_SCHEDULE_REQUIRED_MESSAGE, ok: false };
  }

  const startedAt = new Date(startedAtInput);
  const endedAt = new Date(endedAtInput);
  if (
    !Number.isFinite(startedAt.getTime()) ||
    !Number.isFinite(endedAt.getTime())
  ) {
    return { errorMessage: VOTE_SCHEDULE_INVALID_MESSAGE, ok: false };
  }
  if (startedAt.getTime() <= now.getTime()) {
    return { errorMessage: VOTE_SCHEDULE_FUTURE_MESSAGE, ok: false };
  }
  if (endedAt.getTime() <= startedAt.getTime()) {
    return { errorMessage: VOTE_SCHEDULE_ORDER_MESSAGE, ok: false };
  }

  return {
    ok: true,
    schedule: {
      endedAt: endedAt.toISOString(),
      startedAt: startedAt.toISOString(),
    },
  };
}

export function toDateTimeLocalValue(isoValue: string) {
  const date = new Date(isoValue);
  if (!Number.isFinite(date.getTime())) return '';

  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join('T');
}
