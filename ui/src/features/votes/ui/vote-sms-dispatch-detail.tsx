import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SmsDelivery, SmsDispatchDetail, SmsPurpose } from "@/features/votes/model/vote-sms.types";
import { formatKoreanDateTime } from "@/shared/lib/date-format";

const purposeLabels: Record<SmsPurpose, string> = {
  FIELD_VOTING_SESSION_NOTICE: "현장·방문 세션 안내",
  UPCOMING_VOTE_NOTICE: "투표 예정 안내",
  VOTE_PARTICIPATION_REMINDER: "참여 독려",
  VOTE_RESULT_NOTICE: "투표 결과 안내",
};

export function VoteSmsDispatchDetail({
  dispatch,
  onPageChange,
  onOpenParticipationLink,
  openingParticipationLinkElectorId,
  participationLinkError,
}: {
  dispatch: SmsDispatchDetail;
  onPageChange: (page: number) => void;
  onOpenParticipationLink?: (delivery: SmsDelivery) => void;
  openingParticipationLinkElectorId?: string;
  participationLinkError?: string;
}) {
  const showParticipationLinks =
    dispatch.purpose === "VOTE_PARTICIPATION_REMINDER" &&
    onOpenParticipationLink !== undefined;

  return (
    <div className="space-y-5">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">발송 요약</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Summary label="발송 시각" value={formatKoreanDateTime(dispatch.sentAt)} />
          <Summary label="목적" value={purposeLabels[dispatch.purpose]} />
          <Summary label="전체" value={`${dispatch.recipientCount.toLocaleString()}명`} />
          <Summary label="성공" value={`${dispatch.successCount.toLocaleString()}건`} tone="success" />
          <Summary label="실패" value={`${dispatch.failureCount.toLocaleString()}건`} tone="failure" />
        </CardContent>
      </Card>

      <Card className="min-w-0 rounded-lg">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">수신자별 발송 결과</CardTitle>
            <Badge variant="outline">총 {dispatch.totalItems.toLocaleString()}명</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {participationLinkError ? (
            <p role="alert" className="text-sm text-destructive">
              {participationLinkError}
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-md border">
            <table aria-label="수신자별 문자 발송 결과" className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">수신자</th>
                  <th className="px-3 py-2 font-medium">식별자</th>
                  <th className="px-3 py-2 font-medium">상태</th>
                  <th className="px-3 py-2 font-medium">실패 사유</th>
                  {showParticipationLinks ? (
                    <th className="px-3 py-2 font-medium">참여 링크</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {dispatch.deliveries.map((delivery) => (
                  <tr key={delivery.electorId}>
                    <td className="px-3 py-3 font-medium">{delivery.recipientName}</td>
                    <td className="px-3 py-3">{delivery.recipientIdentifier}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {delivery.status === "SUCCESS" ? (
                          <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                        ) : (
                          <XCircle className="size-4 text-destructive" aria-hidden="true" />
                        )}
                        {delivery.status === "SUCCESS" ? "성공" : "실패"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{formatFailureReason(delivery.failureReason)}</td>
                    {showParticipationLinks ? (
                      <td className="px-3 py-3">
                        {delivery.status === "SUCCESS" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            aria-label={`${delivery.recipientName} 참여 링크 보기`}
                            disabled={openingParticipationLinkElectorId === delivery.electorId}
                            onClick={() => onOpenParticipationLink(delivery)}
                          >
                            {openingParticipationLinkElectorId === delivery.electorId
                              ? "링크 여는 중…"
                              : "링크 보기"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="수신자별 발송 결과 페이지" className="flex items-center justify-between gap-3">
            <Button type="button" size="sm" variant="outline" disabled={dispatch.page <= 1} onClick={() => onPageChange(dispatch.page - 1)}>이전</Button>
            <p className="text-sm tabular-nums text-muted-foreground">{dispatch.page} / {Math.max(1, dispatch.totalPages)} 페이지</p>
            <Button type="button" size="sm" variant="outline" disabled={dispatch.totalPages === 0 || dispatch.page >= dispatch.totalPages} onClick={() => onPageChange(dispatch.page + 1)}>다음</Button>
          </nav>
        </CardContent>
      </Card>
    </div>
  );
}

function formatFailureReason(reason: string | undefined): string {
  if (!reason) return "-";
  if (reason === "SIMULATED_RANDOM_FAILURE" || reason === "SIMULATED_FAILURE") {
    return "문자 발송에 실패했습니다.";
  }
  return reason;
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "success" | "failure" }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={tone === "success" ? "mt-1 font-semibold text-emerald-700" : tone === "failure" ? "mt-1 font-semibold text-destructive" : "mt-1 font-semibold"}>{value}</p>
    </div>
  );
}
