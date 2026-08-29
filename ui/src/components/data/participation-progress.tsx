interface ParticipationProgressProps {
  isKnown?: boolean;
  max: number;
  value: number;
}

function getProgressPercent(value: number, max: number) {
  if (max <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

export function ParticipationProgress({
  isKnown = true,
  max,
  value,
}: ParticipationProgressProps) {
  const percent = isKnown ? getProgressPercent(value, max) : 0;

  return (
    <div className="grid min-w-40 gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">참여율</span>
        <span className="text-muted-foreground">
          {isKnown ? `${percent}%` : "집계 전"}
        </span>
      </div>
      <div
        aria-label="참여율"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        aria-valuetext={isKnown ? `${percent}%` : "집계 전"}
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {isKnown
          ? `${value.toLocaleString()} / ${max.toLocaleString()}명`
          : `참여 집계 전 / ${max.toLocaleString()}명 대상`}
      </p>
    </div>
  );
}
