import { UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoteCandidate } from "@/features/votes/model/vote.types";

interface CandidateListProps {
  candidates: VoteCandidate[];
}

export function CandidateList({ candidates }: CandidateListProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>후보자</CardTitle>
      </CardHeader>
      <CardContent>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 후보자가 없습니다.</p>
        ) : (
          <div className="grid gap-3">
            {candidates
              .slice()
              .sort((first, second) => first.order - second.order)
              .map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <UserRound
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{candidate.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {candidate.description}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
