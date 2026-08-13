import { formatKoreanDateTime } from "@/shared/lib/date-format";

interface PeriodRangeProps {
  endsAt: string;
  startsAt: string;
}

export function PeriodRange({ endsAt, startsAt }: PeriodRangeProps) {
  return (
    <span>
      {formatKoreanDateTime(startsAt)} - {formatKoreanDateTime(endsAt)}
    </span>
  );
}
