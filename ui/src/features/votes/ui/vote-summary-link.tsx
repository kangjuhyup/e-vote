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
      className="grid touch-manipulation gap-3 rounded-md border p-4 transition-[color,background-color,border-color,box-shadow] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{vote.title}</h3>
          <StatusBadge
            label={getVoteStatusLabel(vote.status, vote.billingOrderStatus)}
            variant={getVoteStatusVariant(
              vote.status,
              vote.billingOrderStatus,
            )}
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
        isKnown={vote.participationKnown}
        value={vote.participatedCount}
        max={vote.electorCount}
      />
    </Link>
  );
}
