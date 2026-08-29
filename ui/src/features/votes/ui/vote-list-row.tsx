import Link from "next/link";

import { ParticipationProgress } from "@/components/data/participation-progress";
import { PeriodRange } from "@/components/data/period-range";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { VoteSummary } from "@/features/votes/model/vote.types";

import { getVoteStatusLabel, getVoteStatusVariant } from "../lib/vote-view-models";

interface VoteListRowProps {
  vote: VoteSummary;
}

export function VoteListRow({ vote }: VoteListRowProps) {
  return (
    <Card className="rounded-lg">
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_220px_150px] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{vote.title}</h2>
            <StatusBadge
              label={getVoteStatusLabel(vote.status)}
              variant={getVoteStatusVariant(vote.status)}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            <PeriodRange startsAt={vote.startsAt} endsAt={vote.endsAt} />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            선거인 {vote.electorCount.toLocaleString()}명 /{" "}
            {vote.participationKnown
              ? `참여 ${vote.participatedCount.toLocaleString()}명`
              : "참여 집계 전"}
          </p>
        </div>
        <ParticipationProgress
          isKnown={vote.participationKnown}
          value={vote.participatedCount}
          max={vote.electorCount}
        />
        <Button type="button" variant="outline" asChild>
          <Link href={`/votes/${vote.id}`}>상세 보기</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
