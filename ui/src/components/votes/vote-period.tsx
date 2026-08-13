import { formatKoreanDateTime } from "@/shared/lib/date-format";

interface VotePeriodProps {
  startsAt: string;
  endsAt: string;
}

export function VotePeriod({ startsAt, endsAt }: VotePeriodProps) {
  return (
    <span>
      {formatKoreanDateTime(startsAt)} - {formatKoreanDateTime(endsAt)}
    </span>
  );
}
