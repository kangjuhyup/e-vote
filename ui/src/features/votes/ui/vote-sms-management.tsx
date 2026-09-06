import { CheckCircle2, MessageSquareText, Send, XCircle } from "lucide-react";
import type { FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  SmsDispatchDetail,
  SmsDispatchSummary,
  SmsPurpose,
  VoteSmsPurpose,
} from "@/features/votes/model/vote-sms.types";
import { formatKoreanDateTime } from "@/shared/lib/date-format";

const purposeLabels: Record<SmsPurpose, string> = {
  FIELD_VOTING_SESSION_NOTICE: "현장·방문 세션 안내",
  UPCOMING_VOTE_NOTICE: "투표 예정 안내",
  VOTE_PARTICIPATION_REMINDER: "참여 독려",
  VOTE_RESULT_NOTICE: "투표 결과 안내",
};

const sendLabels: Record<VoteSmsPurpose, string> = {
  UPCOMING_VOTE_NOTICE: "투표 예정 안내 문자 발송",
  VOTE_PARTICIPATION_REMINDER: "참여 독려 문자 발송",
  VOTE_RESULT_NOTICE: "투표 결과 안내 문자 발송",
};

interface VoteSmsManagementProps {
  detailError?: string;
  dispatches: SmsDispatchSummary[];
  draft: string;
  historyError?: string;
  isDetailLoading: boolean;
  isHistoryLoading: boolean;
  isSending: boolean;
  message?: string;
  onDraftChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRetryDetail: () => void;
  onRetryHistory: () => void;
  onSelectDispatch: (id: string) => void;
  onSend: (purpose: VoteSmsPurpose) => void;
  page: number;
  purpose?: VoteSmsPurpose;
  selectedDispatch?: SmsDispatchDetail;
  selectedDispatchId?: string;
  totalPages: number;
}

export function VoteSmsManagement({
  detailError,
  dispatches,
  draft,
  historyError,
  isDetailLoading,
  isHistoryLoading,
  isSending,
  message,
  onDraftChange,
  onPageChange,
  onRetryDetail,
  onRetryHistory,
  onSelectDispatch,
  onSend,
  page,
  purpose,
  selectedDispatch,
  selectedDispatchId,
  totalPages,
}: VoteSmsManagementProps) {
  return (
    <section aria-labelledby="vote-sms-title" className="space-y-4">
      <div>
        <h2 id="vote-sms-title" className="text-lg font-semibold">
          문자 안내
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          투표 상태에 맞는 안내 문자를 발송하고 수신자별 처리 결과를 확인합니다.
        </p>
      </div>
      {message ? (
        <p role="status" className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
          {message}
        </p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
        <Card className="rounded-lg xl:sticky xl:top-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquareText className="size-5 text-muted-foreground" aria-hidden="true" />
              <CardTitle className="text-base">문자 작성</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {purpose ? (
              <form
                className="space-y-4"
                onSubmit={(event) => submitHandler(event, () => onSend(purpose))}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">발송 목적</span>
                  <Badge variant="outline">{purposeLabels[purpose]}</Badge>
                </div>
                <label className="grid gap-2 text-sm font-medium">
                  문자 내용
                  <Textarea
                    value={draft}
                    onChange={(event) => onDraftChange(event.target.value)}
                    placeholder="수신자에게 전달할 안내 내용을 입력하세요."
                    required
                  />
                </label>
                <p className="text-xs leading-5 text-muted-foreground">
                  버튼을 누르면 대상 선거인에게 즉시 발송됩니다. {purpose === "VOTE_PARTICIPATION_REMINDER" ? "각 미참여자에게 개인별 보안 참여 링크가 자동으로 추가됩니다. " : null}본문과 전화번호, 참여 링크는 발송 이력에 저장되지 않습니다.
                </p>
                <Button type="submit" className="w-full" disabled={isSending || draft.trim().length === 0}>
                  <Send aria-hidden="true" />
                  {isSending ? "발송 중…" : sendLabels[purpose]}
                </Button>
              </form>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                취소된 투표에는 안내 문자를 발송할 수 없습니다. 기존 발송 이력만 확인할 수 있습니다.
              </p>
            )}
          </CardContent>
        </Card>
        <div className="min-w-0 space-y-5">
          <DispatchHistory
            dispatches={dispatches}
            error={historyError}
            isLoading={isHistoryLoading}
            onPageChange={onPageChange}
            onRetry={onRetryHistory}
            onSelect={onSelectDispatch}
            page={page}
            selectedId={selectedDispatchId}
            totalPages={totalPages}
          />
          {selectedDispatchId ? (
            <DispatchDetail
              dispatch={selectedDispatch}
              error={detailError}
              isLoading={isDetailLoading}
              onRetry={onRetryDetail}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DispatchHistory({
  dispatches,
  error,
  isLoading,
  onPageChange,
  onRetry,
  onSelect,
  page,
  selectedId,
  totalPages,
}: {
  dispatches: SmsDispatchSummary[];
  error?: string;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onSelect: (id: string) => void;
  page: number;
  selectedId?: string;
  totalPages: number;
}) {
  return (
    <Card className="min-w-0 rounded-lg">
      <CardHeader>
        <CardTitle className="text-base">발송 이력</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">발송 이력을 불러오는 중…</p>
        ) : error ? (
          <InlineError message={error} onRetry={onRetry} />
        ) : dispatches.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">아직 발송한 문자가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table aria-label="문자 발송 이력" className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">발송 시각</th>
                  <th className="px-3 py-2 font-medium">목적</th>
                  <th className="px-3 py-2 text-right font-medium">대상</th>
                  <th className="px-3 py-2 text-right font-medium">성공</th>
                  <th className="px-3 py-2 text-right font-medium">실패</th>
                  <th className="px-3 py-2 text-right font-medium">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dispatches.map((dispatch) => (
                  <tr key={dispatch.id} className={selectedId === dispatch.id ? "bg-accent/50" : undefined}>
                    <td className="whitespace-nowrap px-3 py-3">{formatKoreanDateTime(dispatch.sentAt)}</td>
                    <td className="px-3 py-3">{purposeLabels[dispatch.purpose]}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{dispatch.recipientCount}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{dispatch.successCount}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-destructive">{dispatch.failureCount}</td>
                    <td className="px-3 py-3 text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => onSelect(dispatch.id)} aria-label={`${formatKoreanDateTime(dispatch.sentAt)} 발송 상세 보기`}>
                        보기
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PageControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  );
}

function DispatchDetail({
  dispatch,
  error,
  isLoading,
  onRetry,
}: {
  dispatch?: SmsDispatchDetail;
  error?: string;
  isLoading: boolean;
  onRetry: () => void;
}) {
  return (
    <Card className="min-w-0 rounded-lg">
      <CardHeader>
        <CardTitle className="text-base">수신자별 발송 결과</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">상세 결과를 불러오는 중…</p>
        ) : error ? (
          <InlineError message={error} onRetry={onRetry} />
        ) : dispatch ? (
          <div className="overflow-x-auto rounded-md border">
            <table aria-label="수신자별 문자 발송 결과" className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">수신자</th>
                  <th className="px-3 py-2 font-medium">식별자</th>
                  <th className="px-3 py-2 font-medium">상태</th>
                  <th className="px-3 py-2 font-medium">실패 사유</th>
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
                    <td className="px-3 py-3 text-muted-foreground">{delivery.failureReason ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
      <p className="text-sm text-destructive">{message}</p>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>다시 시도</Button>
    </div>
  );
}

function PageControls({
  onPageChange,
  page,
  totalPages,
}: {
  onPageChange: (page: number) => void;
  page: number;
  totalPages: number;
}) {
  return (
    <nav aria-label="문자 발송 이력 페이지" className="flex items-center justify-between gap-3">
      <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>이전</Button>
      <p className="text-sm tabular-nums text-muted-foreground">{page} / {Math.max(1, totalPages)} 페이지</p>
      <Button type="button" size="sm" variant="outline" disabled={totalPages === 0 || page >= totalPages} onClick={() => onPageChange(page + 1)}>다음</Button>
    </nav>
  );
}

function submitHandler(event: FormEvent<HTMLFormElement>, handler: () => void) {
  event.preventDefault();
  handler();
}
