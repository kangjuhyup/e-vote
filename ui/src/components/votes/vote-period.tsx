interface VotePeriodProps {
  startsAt: string;
  endsAt: string;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function VotePeriod({ startsAt, endsAt }: VotePeriodProps) {
  return (
    <span>
      {formatDateTime(startsAt)} - {formatDateTime(endsAt)}
    </span>
  );
}
