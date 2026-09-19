import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { VoteSummary } from "@/features/votes/model/vote.types";
import { formatKoreanDateTime } from "@/shared/lib/date-format";

export function VotePaymentAttention({ votes }: { votes: VoteSummary[] }) {
  return (
    <section aria-label="결제·확정 확인이 필요한 투표">
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <CardTitle>시작 임박 · 결제 확인 필요 {votes.length}건</CardTitle>
          <CardDescription>
            시작까지 24시간 이내인데 아직 확정되지 않은 투표입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3">
            {votes.map((vote) => (
              <li key={vote.id}>
                <Link
                  href={`/votes/${vote.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{vote.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      시작 {formatKoreanDateTime(vote.startsAt)}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {vote.billingOrderStatus === "PENDING_PAYMENT"
                      ? "결제 미완료"
                      : vote.billingOrderStatus === "REFUND_PENDING"
                        ? "환불 처리 중"
                        : "결제·확정 확인 필요"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
