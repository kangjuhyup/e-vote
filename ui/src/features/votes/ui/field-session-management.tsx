import { CalendarClock, Info, MapPin, Plus } from "lucide-react";
import type { FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { FieldSessionRecord } from "@/features/votes/model/vote-operations.types";
import { formatKoreanDateTime } from "@/shared/lib/date-format";

const statusLabels = { SCHEDULED: "예약", OPEN: "진행 중", CLOSED: "종료", CANCELED: "취소" } as const;

interface FieldSessionManagementProps {
  isSubmitting: boolean;
  message?: string;
  onChangeStatus: (id: string, action: "cancel" | "close" | "open") => void;
  onCreate: (data: FormData) => void;
  readAvailable: boolean;
  sessions: FieldSessionRecord[];
}

export function FieldSessionManagement({ isSubmitting, message, onChangeStatus, onCreate, readAvailable, sessions }: FieldSessionManagementProps) {
  return (
    <div className="space-y-5">
      {!readAvailable ? <p className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"><Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />현재 서버에는 현장 세션 조회 API가 없습니다. 이 화면에서 생성한 세션만 현재 세션 동안 표시됩니다.</p> : null}
      {message ? <p className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">{message}</p> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
        <section aria-labelledby="field-session-title" className="space-y-3">
          <h2 id="field-session-title" className="text-lg font-semibold">현장 및 방문 세션</h2>
          {sessions.length === 0 ? <Card className="rounded-lg"><CardContent className="py-8 text-center text-sm text-muted-foreground">조회 가능한 현장 투표 세션이 없습니다.</CardContent></Card> : sessions.map((session) => (
            <Card key={session.id} className="rounded-lg">
              <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-base">{session.title}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{session.id}</p></div><Badge variant={session.status === "OPEN" ? "default" : "outline"}>{statusLabels[session.status]}</Badge></div></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2"><p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span>{session.locationName}<br /><span className="text-muted-foreground">{session.address}</span></span></p><p className="flex items-start gap-2"><CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span>{formatKoreanDateTime(session.startsAt)}<br /><span className="text-muted-foreground">{formatKoreanDateTime(session.endsAt)} 종료</span></span></p></div>
                <div className="flex flex-wrap gap-2">{session.status === "SCHEDULED" ? <Button size="sm" onClick={() => onChangeStatus(session.id, "open")} disabled={isSubmitting}>세션 개시</Button> : null}{session.status === "OPEN" ? <Button size="sm" onClick={() => onChangeStatus(session.id, "close")} disabled={isSubmitting}>세션 종료</Button> : null}{session.status === "SCHEDULED" || session.status === "OPEN" ? <Button size="sm" variant="outline" onClick={() => onChangeStatus(session.id, "cancel")} disabled={isSubmitting}>세션 취소</Button> : null}</div>
              </CardContent>
            </Card>
          ))}
        </section>
        <Card className="rounded-lg xl:sticky xl:top-5">
          <CardHeader><div className="flex items-center gap-2"><Plus className="size-5 text-muted-foreground" aria-hidden="true" /><CardTitle className="text-base">세션 생성</CardTitle></div></CardHeader>
          <CardContent><form className="grid gap-4 sm:grid-cols-2" onSubmit={formHandler(onCreate)}><Field label="투표 ID" name="voteId" defaultValue="active-general" required className="sm:col-span-2" /><Field label="위원회 ID" name="commissionId" defaultValue="commission-1" required /><label className="grid gap-2 text-sm font-medium">채널<Select name="channel" defaultValue="ONSITE"><option value="ONSITE">현장</option><option value="VISIT">방문</option></Select></label><Field label="세션 제목" name="title" required className="sm:col-span-2" /><Field label="장소 이름" name="locationName" required /><Field label="주소" name="address" required /><Field label="관리자 ID" name="managerIds" placeholder="쉼표로 구분" required className="sm:col-span-2" /><Field label="시작 시각" name="startsAt" type="datetime-local" required /><Field label="종료 시각" name="endsAt" type="datetime-local" required /><Button type="submit" className="sm:col-span-2" disabled={isSubmitting}>세션 생성</Button></form></CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ className, label, name, ...props }: { className?: string; label: string; name: string } & React.ComponentProps<typeof Input>) { return <label className={`grid gap-2 text-sm font-medium ${className ?? ""}`}>{label}<Input name={name} {...props} /></label>; }
function formHandler(handler: (data: FormData) => void) { return (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); handler(new FormData(event.currentTarget)); }; }
