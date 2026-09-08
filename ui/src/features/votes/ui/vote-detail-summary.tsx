import { Link2 } from "lucide-react";
import Link from "next/link";

import { ParticipationProgress } from "@/components/data/participation-progress";
import { PeriodRange } from "@/components/data/period-range";
import { StatusBadge } from "@/components/data/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { VoteDetail } from "@/features/votes/model/vote.types";
import type { VoteBillingLifecycleStatus } from "@/features/votes/lib/vote-finalization";

import { getVoteStatusLabel, getVoteStatusVariant } from "../lib/vote-view-models";

interface VoteDetailSummaryProps {
  billingOrderStatus?: VoteBillingLifecycleStatus;
  vote: VoteDetail;
}

export function VoteDetailSummary({
  billingOrderStatus,
  vote,
}: VoteDetailSummaryProps) {
  const effectiveBillingOrderStatus =
    billingOrderStatus ?? vote.billingOrderStatus;
  const showDevelopmentParticipationLinks =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{vote.title}</CardTitle>
          <StatusBadge
            label={getVoteStatusLabel(vote.status, effectiveBillingOrderStatus)}
            variant={getVoteStatusVariant(
              vote.status,
              effectiveBillingOrderStatus,
            )}
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">
            {vote.description}
          </p>
          <div className="text-sm">
            <span className="font-medium">투표 기간: </span>
            <PeriodRange startsAt={vote.startsAt} endsAt={vote.endsAt} />
          </div>
          {vote.electoralRollSnapshotId ? (
            <div className="text-sm">
              <span className="font-medium">선거인명부 스냅샷: </span>
              <code className="break-all rounded bg-muted px-1.5 py-0.5 text-xs">
                {vote.electoralRollSnapshotId}
              </code>
            </div>
          ) : null}
          {showDevelopmentParticipationLinks ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={`/votes/${vote.id}/electors`}>
                <Link2 aria-hidden="true" />
                선거인별 참여 링크
              </Link>
            </Button>
          ) : null}
        </div>
        <ParticipationProgress
          isKnown={vote.participationKnown}
          value={vote.participatedCount}
          max={vote.electorCount}
        />
      </CardContent>
    </Card>
  );
}
