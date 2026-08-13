import { CheckCircle2, CircleDashed } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoteElector } from "@/features/votes/model/vote.types";

interface ElectorRosterProps {
  electors: VoteElector[];
}

function formatParticipatedAt(value: string | null) {
  if (!value) {
    return "미참여";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ElectorRoster({ electors }: ElectorRosterProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>선거인명부</CardTitle>
      </CardHeader>
      <CardContent>
        {electors.length === 0 ? (
          <p className="text-sm text-muted-foreground">표시할 선거인이 없습니다.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {electors.map((elector) => (
              <div
                key={elector.id}
                className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="font-medium">{elector.name}</p>
                  <p className="text-sm text-muted-foreground">{elector.label}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {elector.participated ? (
                    <CheckCircle2
                      className="size-4 text-emerald-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <CircleDashed
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {elector.participated ? "참여" : "미참여"} ·{" "}
                    {formatParticipatedAt(elector.participatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
