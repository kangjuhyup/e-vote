import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoteSummary } from "@/features/votes/model/vote.types";

import { VoteSummaryLink } from "./vote-summary-link";

interface VoteSummarySectionProps {
  emptyLabel: string;
  title: string;
  votes: VoteSummary[];
}

export function VoteSummarySection({
  emptyLabel,
  title,
  votes,
}: VoteSummarySectionProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {votes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="grid gap-3">
            {votes.map((vote) => (
              <VoteSummaryLink key={vote.id} vote={vote} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
