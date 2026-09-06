import { CalendarClock, MapPin, MessageSquareText, Plus, Send } from "lucide-react";
import type { FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CommissionMemberRecord,
  FieldSessionRecord,
} from "@/features/votes/model/vote-operations.types";
import { formatKoreanDateTime } from "@/shared/lib/date-format";

const statusLabels = {
  SCHEDULED: "예약",
  OPEN: "진행 중",
  CLOSED: "종료",
  CANCELED: "취소",
} as const;

interface FieldSessionManagementProps {
  allowedChannels: readonly ("ONSITE" | "VISIT")[];
  commissionId?: string;
  isManagersLoading: boolean;
  isSubmitting: boolean;
  managers: CommissionMemberRecord[];
  message?: string;
  onChangeStatus: (
    id: string,
    action: "cancel" | "close" | "open",
  ) => void;
  onCreate: (data: FormData) => void;
  onPageChange: (page: number) => void;
  onSendSms: (id: string) => void;
  onSmsDraftChange: (id: string, value: string) => void;
  page: number;
  pendingSmsSessionId?: string;
  sessions: FieldSessionRecord[];
  smsDrafts: Record<string, string>;
  smsEnabled: boolean;
  totalPages: number;
}

export function FieldSessionManagement({
  allowedChannels,
  commissionId,
  isManagersLoading,
  isSubmitting,
  managers,
  message,
  onChangeStatus,
  onCreate,
  onPageChange,
  onSendSms,
  onSmsDraftChange,
  page,
  pendingSmsSessionId,
  sessions,
  smsDrafts,
  smsEnabled,
  totalPages,
}: FieldSessionManagementProps) {
  return (
    <div className="space-y-5">
      {message ? (
        <p className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
          {message}
        </p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <section aria-labelledby="field-session-title" className="space-y-3">
          <h2 id="field-session-title" className="text-lg font-semibold">
            현장 및 방문 세션
          </h2>
          {sessions.length === 0 ? (
            <EmptySessionCard>
              이 투표에 등록된 현장 투표 세션이 없습니다.
            </EmptySessionCard>
          ) : (
            sessions.map((session) => (
              <Card key={session.id} className="rounded-lg">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle className="text-base">
                      {session.title}
                    </CardTitle>
                    <Badge
                      variant={session.status === "OPEN" ? "default" : "outline"}
                    >
                      {statusLabels[session.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <p className="flex items-start gap-2">
                      <MapPin
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span>
                        {session.locationName}
                        <br />
                        <span className="text-muted-foreground">
                          {session.address}
                        </span>
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <CalendarClock
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span>
                        {formatKoreanDateTime(session.startsAt)}
                        <br />
                        <span className="text-muted-foreground">
                          {formatKoreanDateTime(session.endsAt)} 종료
                        </span>
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.status === "SCHEDULED" ? (
                      <Button
                        size="sm"
                        onClick={() => onChangeStatus(session.id, "open")}
                        disabled={isSubmitting}
                      >
                        세션 개시
                      </Button>
                    ) : null}
                    {session.status === "OPEN" ? (
                      <Button
                        size="sm"
                        onClick={() => onChangeStatus(session.id, "close")}
                        disabled={isSubmitting}
                      >
                        세션 종료
                      </Button>
                    ) : null}
                    {session.status === "SCHEDULED" ||
                    session.status === "OPEN" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onChangeStatus(session.id, "cancel")}
                        disabled={isSubmitting}
                      >
                        세션 취소
                      </Button>
                    ) : null}
                  </div>
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="size-4 text-muted-foreground" aria-hidden="true" />
                      <p className="text-sm font-medium">세션 안내 문자</p>
                    </div>
                    <label className="grid gap-2 text-sm font-medium">
                      <span className="sr-only">{session.title} 안내 문자</span>
                      <Textarea
                        aria-label={`${session.title} 안내 문자`}
                        className="min-h-20"
                        value={smsDrafts[session.id] ?? ""}
                        onChange={(event) => onSmsDraftChange(session.id, event.target.value)}
                        placeholder="장소, 운영 시간 등 안내 내용을 입력하세요."
                        disabled={!smsEnabled || pendingSmsSessionId === session.id}
                      />
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        {smsEnabled
                          ? "이 세션의 대상 선거인에게 즉시 발송됩니다."
                          : "진행 중인 투표에서만 발송할 수 있습니다."}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`${session.title} 안내 문자 발송`}
                        disabled={
                          !smsEnabled ||
                          pendingSmsSessionId !== undefined ||
                          (smsDrafts[session.id]?.trim().length ?? 0) === 0
                        }
                        onClick={() => onSendSms(session.id)}
                      >
                        <Send aria-hidden="true" />
                        {pendingSmsSessionId === session.id ? "발송 중…" : "안내 문자 발송"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          <PageControls
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </section>
        <Card className="rounded-lg xl:sticky xl:top-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <CardTitle className="text-base">세션 생성</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={formHandler(onCreate)}
            >
              <label className="grid gap-2 text-sm font-medium">
                채널
                <Select name="channel" defaultValue={allowedChannels[0]}>
                  {allowedChannels.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel === "ONSITE" ? "현장" : "방문"}
                    </option>
                  ))}
                </Select>
              </label>
              <Field
                label="세션 제목"
                name="title"
                required
                className="sm:col-span-2"
              />
              <Field label="장소 이름" name="locationName" required />
              <Field label="주소" name="address" required />
              <fieldset className="grid gap-2 sm:col-span-2">
                <legend className="text-sm font-medium">담당 관리자</legend>
                {isManagersLoading ? (
                  <p className="text-sm text-muted-foreground">
                    관리자 목록을 불러오는 중…
                  </p>
                ) : managers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    선택할 수 있는 활성 위원이 없습니다.
                  </p>
                ) : (
                  <div className="grid gap-2 rounded-md border p-3">
                    {managers.map((manager) => (
                      <label
                        key={manager.id}
                        className="flex min-h-10 items-center gap-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="managerIds"
                          value={manager.id}
                          className="size-4 rounded border"
                        />
                        <span>
                          {manager.name} ·{" "}
                          {manager.role === "ADMIN" ? "관리자" : "현장 관리자"}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
              <Field
                label="시작 시각"
                name="startsAt"
                type="datetime-local"
                required
              />
              <Field
                label="종료 시각"
                name="endsAt"
                type="datetime-local"
                required
              />
              <Button
                type="submit"
                className="sm:col-span-2"
                disabled={
                  isSubmitting ||
                  isManagersLoading ||
                  !commissionId ||
                  managers.length === 0
                }
              >
                세션 생성
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptySessionCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
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
    <nav
      aria-label="현장 투표 세션 목록 페이지"
      className="flex items-center justify-between gap-3"
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        이전
      </Button>
      <p className="text-sm tabular-nums text-muted-foreground">
        {page} / {Math.max(1, totalPages)} 페이지
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={totalPages === 0 || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        다음
      </Button>
    </nav>
  );
}

function Field({
  className,
  label,
  name,
  ...props
}: {
  className?: string;
  label: string;
  name: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <label className={`grid gap-2 text-sm font-medium ${className ?? ""}`}>
      {label}
      <Input name={name} {...props} />
    </label>
  );
}

function formHandler(handler: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handler(new FormData(event.currentTarget));
  };
}
