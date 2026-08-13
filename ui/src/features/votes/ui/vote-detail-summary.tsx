import { ParticipationProgress } from "@/components/data/participation-progress";
import { PeriodRange } from "@/components/data/period-range";
import { StatusBadge } from "@/components/data/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { VoteDetail } from "@/features/votes/model/vote.types";

import { getVoteStatusLabel, getVoteStatusVariant } from "../lib/vote-view-models";

interface VoteDetailSummaryProps {
  vote: VoteDetail;
}

export function VoteDetailSummary({ vote }: VoteDetailSummaryProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{vote.title}</CardTitle>
          <StatusBadge
            label={getVoteStatusLabel(vote.status)}
            variant={getVoteStatusVariant(vote.status)}
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
        </div>
        <ParticipationProgress
          value={vote.participatedCount}
          max={vote.electorCount}
        />
      </CardContent>
    </Card>
  );
}
