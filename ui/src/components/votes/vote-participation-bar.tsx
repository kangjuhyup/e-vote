import { getParticipationPercent } from "@/features/votes/model/vote-selectors";

interface VoteParticipationBarProps {
  participatedCount: number;
  electorCount: number;
}

export function VoteParticipationBar({
  participatedCount,
  electorCount,
}: VoteParticipationBarProps) {
  const percent = getParticipationPercent(participatedCount, electorCount);

  return (
    <div className="min-w-40 space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{percent}%</span>
        <span className="text-muted-foreground">
          {participatedCount.toLocaleString()} / {electorCount.toLocaleString()}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-sm bg-muted">
        <div
          className="h-full rounded-sm bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
