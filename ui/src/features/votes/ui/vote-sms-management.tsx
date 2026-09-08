import { MessageSquareText, Send } from "lucide-react";
import Link from "next/link";
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
  SmsDispatchSummary,
  ParticipationReminderTemplate,
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
  dispatches: SmsDispatchSummary[];
  draft: string;
  historyError?: string;
  isHistoryLoading: boolean;
  isSending: boolean;
  isTemplateLoading: boolean;
  message?: string;
  onDraftChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRetryHistory: () => void;
  onRetryTemplate: () => void;
  onSend: (purpose: VoteSmsPurpose) => void;
  page: number;
  purpose?: VoteSmsPurpose;
  participationReminderTemplate?: ParticipationReminderTemplate;
  templateError?: string;
  totalPages: number;
  voteId: string;
}

export function VoteSmsManagement({
  dispatches,
  draft,
  historyError,
  isHistoryLoading,
  isSending,
  isTemplateLoading,
  message,
  onDraftChange,
  onPageChange,
  onRetryHistory,
  onRetryTemplate,
  onSend,
  page,
  purpose,
  participationReminderTemplate,
  templateError,
  totalPages,
  voteId,
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
                {purpose === "VOTE_PARTICIPATION_REMINDER" ? (
                  isTemplateLoading ? (
                    <p className="rounded-md border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">발송 내용을 불러오는 중…</p>
                  ) : templateError ? (
                    <InlineError message={templateError} onRetry={onRetryTemplate} />
                  ) : participationReminderTemplate ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">발송 내용 미리보기</p>
                      <div className="rounded-xl bg-[#f7e600] p-4 text-sm text-[#191919] shadow-sm">
                        <p className="whitespace-pre-line leading-6">{participationReminderTemplate.content}</p>
                        <div className="mt-4 rounded-md bg-white/80 px-3 py-2 text-center font-medium">
                          {participationReminderTemplate.buttonLabel}
                        </div>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">버튼에는 수신자별 개인 참여 링크가 연결됩니다.</p>
                    </div>
                  ) : null
                ) : (
                  <label className="grid gap-2 text-sm font-medium">
                    문자 내용
                    <Textarea
                      value={draft}
                      onChange={(event) => onDraftChange(event.target.value)}
                      placeholder="수신자에게 전달할 안내 내용을 입력하세요."
                      required
                    />
                  </label>
                )}
                <p className="text-xs leading-5 text-muted-foreground">
                  버튼을 누르면 대상 선거인에게 즉시 발송됩니다. 본문과 전화번호, 참여 링크는 발송 이력에 저장되지 않습니다.
                </p>
                <Button type="submit" className="w-full" disabled={isSending || isTemplateLoading || Boolean(templateError) || (purpose === "VOTE_PARTICIPATION_REMINDER" ? !participationReminderTemplate : draft.trim().length === 0)}>
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
            page={page}
            totalPages={totalPages}
            voteId={voteId}
          />
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
  page,
  totalPages,
  voteId,
}: {
  dispatches: SmsDispatchSummary[];
  error?: string;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  page: number;
  totalPages: number;
  voteId: string;
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
                  <tr key={dispatch.id}>
                    <td className="whitespace-nowrap px-3 py-3">{formatKoreanDateTime(dispatch.sentAt)}</td>
                    <td className="px-3 py-3">{purposeLabels[dispatch.purpose]}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{dispatch.recipientCount}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{dispatch.successCount}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-destructive">{dispatch.failureCount}</td>
                    <td className="px-3 py-3 text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/votes/${voteId}/sms-dispatches/${dispatch.id}`} aria-label={`${formatKoreanDateTime(dispatch.sentAt)} 발송 상세 보기`}>
                          보기
                        </Link>
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
