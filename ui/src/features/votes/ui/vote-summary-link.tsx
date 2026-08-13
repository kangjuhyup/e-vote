import Link from "next/link";

import { StatusBadge } from "@/components/data/status-badge";
import { ParticipationProgress } from "@/components/data/participation-progress";
import { PeriodRange } from "@/components/data/period-range";
import type { VoteSummary } from "@/features/votes/model/vote.types";

import { getVoteStatusLabel, getVoteStatusVariant } from "../lib/vote-view-models";

interface VoteSummaryLinkProps {
  actionLabel?: string;
  vote: VoteSummary;
}

export function VoteSummaryLink({
  actionLabel,
  vote,
}: VoteSummaryLinkProps) {
  return (
    <Link
      href={`/votes/${vote.id}`}
      className="grid gap-3 rounded-md border p-4 transition-colors hover:bg-accent sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{vote.title}</h3>
          <StatusBadge
            label={getVoteStatusLabel(vote.status)}
            variant={getVoteStatusVariant(vote.status)}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          <PeriodRange startsAt={vote.startsAt} endsAt={vote.endsAt} />
        </p>
        {actionLabel ? (
          <p className="mt-2 text-sm font-medium">{actionLabel}</p>
        ) : null}
      </div>
      <ParticipationProgress
        value={vote.participatedCount}
        max={vote.electorCount}
      />
    </Link>
  );
}
