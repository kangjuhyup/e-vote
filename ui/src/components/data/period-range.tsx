import { formatKoreanDateTime } from "@/shared/lib/date-format";

interface PeriodRangeProps {
  endsAt: string;
  startsAt: string;
}

export function PeriodRange({ endsAt, startsAt }: PeriodRangeProps) {
  return (
    <span>
      <time dateTime={startsAt}>{formatKoreanDateTime(startsAt)}</time>
      {" - "}
      <time dateTime={endsAt}>{formatKoreanDateTime(endsAt)}</time>
    </span>
  );
}
