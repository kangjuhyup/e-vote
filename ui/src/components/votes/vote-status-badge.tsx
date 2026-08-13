import { Badge } from "@/components/ui/badge";
import type { VoteStatus } from "@/features/votes/model/vote.types";

const voteStatusLabels: Record<VoteStatus, string> = {
  draft: "초안",
  scheduled: "예정",
  active: "진행 중",
  completed: "종료",
  canceled: "취소",
};

const voteStatusClassNames: Record<VoteStatus, string> = {
  draft: "border-muted-foreground/25 bg-muted text-muted-foreground",
  scheduled: "border-blue-500/25 bg-blue-50 text-blue-700",
  active: "border-emerald-500/25 bg-emerald-50 text-emerald-700",
  completed: "border-zinc-500/25 bg-zinc-100 text-zinc-700",
  canceled: "border-destructive/25 bg-destructive/10 text-destructive",
};

interface VoteStatusBadgeProps {
  status: VoteStatus;
}

export function VoteStatusBadge({ status }: VoteStatusBadgeProps) {
  return (
    <Badge variant="outline" className={voteStatusClassNames[status]}>
      {voteStatusLabels[status]}
    </Badge>
  );
}
