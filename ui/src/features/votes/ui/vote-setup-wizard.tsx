import { Check, ChevronRight, Circle, Plus, UsersRound, Vote } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CreateVoteResult } from "@/features/votes/model/vote-operations.types";

export type VoteSetupStep = "ballot" | "basics" | "electors" | "review";

interface VoteSetupWizardProps {
  createdSubVoteId?: string;
  createdVote?: CreateVoteResult;
  errorMessage?: string;
  isSubmitting: boolean;
  onAddElector: (formData: FormData) => void;
  onCreateBallot: (formData: FormData) => void;
  onCreateVote: (formData: FormData) => void;
  onStepChange: (step: VoteSetupStep) => void;
  step: VoteSetupStep;
  successMessage?: string;
}

const steps: Array<{ key: VoteSetupStep; label: string }> = [
  { key: "basics", label: "기본 정책" },
  { key: "ballot", label: "안건과 후보" },
  { key: "electors", label: "선거인" },
  { key: "review", label: "검토" },
];

export function VoteSetupWizard(props: VoteSetupWizardProps) {
  const currentIndex = steps.findIndex((item) => item.key === props.step);

  return (
    <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-start">
      <nav aria-label="투표 설정 진행 상태" className="rounded-lg border bg-card p-3 xl:sticky xl:top-5">
        <ol className="grid gap-1 sm:grid-cols-4 xl:grid-cols-1">
          {steps.map((item, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = item.key === props.step;
            return (
              <li key={item.key}>
                <button type="button" disabled={index > currentIndex || (!props.createdVote && index > 0)} onClick={() => props.onStepChange(item.key)} className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45" aria-current={isCurrent ? "step" : undefined}>
                  <span className={isCurrent || isComplete ? "flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground" : "flex size-6 items-center justify-center rounded-md border text-muted-foreground"}>{isComplete ? <Check className="size-4" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}</span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="space-y-4">
        {props.errorMessage ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{props.errorMessage}</p> : null}
        {props.successMessage ? <p className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">{props.successMessage}</p> : null}
        {props.step === "basics" ? <BasicsForm isSubmitting={props.isSubmitting} onSubmit={props.onCreateVote} /> : null}
        {props.step === "ballot" && props.createdVote ? <BallotForm isSubmitting={props.isSubmitting} onSubmit={props.onCreateBallot} voteId={props.createdVote.id} /> : null}
        {props.step === "electors" && props.createdVote ? <ElectorForm isSubmitting={props.isSubmitting} onSubmit={props.onAddElector} onNext={() => props.onStepChange("review")} /> : null}
        {props.step === "review" && props.createdVote ? <Review createdSubVoteId={props.createdSubVoteId} createdVote={props.createdVote} /> : null}
      </div>
    </div>
  );
}

function BasicsForm({ isSubmitting, onSubmit }: { isSubmitting: boolean; onSubmit: (data: FormData) => void }) {
  return (
    <WizardCard title="기본 정책" description="투표를 주관할 위원회와 기본 정책을 설정합니다.">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={toFormHandler(onSubmit)}>
        <Field label="투표 제목" name="title" required className="sm:col-span-2" />
        <Field label="선거관리위원회 ID" name="commissionId" defaultValue="commission-1" required />
        <label className="grid gap-2 text-sm font-medium">공개 범위<Select name="privacyMode" defaultValue="SECRET"><option value="SECRET">비밀 투표</option><option value="PUBLIC">공개 투표</option></Select></label>
        <label className="grid gap-2 text-sm font-medium">참여 단위<Select name="participationUnit" defaultValue="INDIVIDUAL"><option value="INDIVIDUAL">개인</option><option value="GROUP">그룹</option></Select></label>
        <label className="grid gap-2 text-sm font-medium">가중치 방식<Select name="voteWeightMode" defaultValue="EQUAL"><option value="EQUAL">동일 가중치</option><option value="SHARE">지분 가중치</option></Select></label>
        <label className="grid gap-2 text-sm font-medium">결과 저장<Select name="resultStorageMode" defaultValue="DATABASE"><option value="DATABASE">데이터베이스</option><option value="BLOCKCHAIN">블록체인</option></Select></label>
        <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">허용 채널</legend><div className="mt-2 flex flex-wrap gap-4 text-sm"><CheckOption name="channel" value="ONLINE" label="온라인" defaultChecked /><CheckOption name="channel" value="ONSITE" label="현장" /><CheckOption name="channel" value="VISIT" label="방문" /></div></fieldset>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="identityRequired" className="size-4 rounded border" />본인인증 필수</label>
        <Button type="submit" className="sm:col-span-2" disabled={isSubmitting}><Vote aria-hidden="true" />{isSubmitting ? "생성 중…" : "투표 생성 후 계속"}<ChevronRight aria-hidden="true" /></Button>
      </form>
    </WizardCard>
  );
}

function BallotForm({ isSubmitting, onSubmit, voteId }: { isSubmitting: boolean; onSubmit: (data: FormData) => void; voteId: string }) {
  return (
    <WizardCard title="안건과 후보" description={`부모 투표 ${voteId}에 첫 자식 투표와 후보를 등록합니다.`}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={toFormHandler(onSubmit)}>
        <Field label="자식 투표 제목" name="title" required className="sm:col-span-2" />
        <label className="grid gap-2 text-sm font-medium">유형<Select name="type" defaultValue="CANDIDATE"><option value="CANDIDATE">후보자형</option><option value="YES_NO">찬반형</option></Select></label>
        <Field label="정렬 순서" name="sortOrder" type="number" min="0" defaultValue="0" required />
        <Field label="후보 1" name="candidate1" required />
        <Field label="후보 2" name="candidate2" required />
        <Button type="submit" className="sm:col-span-2" disabled={isSubmitting}><Plus aria-hidden="true" />{isSubmitting ? "등록 중…" : "안건과 후보 등록"}<ChevronRight aria-hidden="true" /></Button>
      </form>
    </WizardCard>
  );
}

function ElectorForm({ isSubmitting, onNext, onSubmit }: { isSubmitting: boolean; onNext: () => void; onSubmit: (data: FormData) => void }) {
  return (
    <WizardCard title="선거인" description="선거인은 한 명씩 추가할 수 있으며 완료 후 관리 화면에서 계속 등록할 수 있습니다.">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={toFormHandler(onSubmit, true)}>
        <Field label="이름" name="name" required />
        <Field label="업무 식별자" name="identifier" required />
        <Field label="그룹 키" name="groupKey" />
        <Field label="투표 가중치" name="voteWeight" type="number" min="1" defaultValue="1" required />
        <Button type="submit" variant="outline" disabled={isSubmitting}><UsersRound aria-hidden="true" />{isSubmitting ? "추가 중…" : "선거인 추가"}</Button>
        <Button type="button" onClick={onNext}>검토로 이동<ChevronRight aria-hidden="true" /></Button>
      </form>
    </WizardCard>
  );
}

function Review({ createdSubVoteId, createdVote }: { createdSubVoteId?: string; createdVote: CreateVoteResult }) {
  return (
    <WizardCard title="설정 검토" description="생성된 식별자를 확인하고 상세 화면에서 추가 설정을 이어가세요.">
      <dl className="grid gap-3 sm:grid-cols-2">
        <Summary label="부모 투표 ID" value={createdVote.id} />
        <Summary label="상태" value="초안" />
        <Summary label="위원회 ID" value={createdVote.commissionId} />
        <Summary label="자식 투표 ID" value={createdSubVoteId ?? "미등록"} />
      </dl>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild><Link href={`/votes/${createdVote.id}`}>투표 상세</Link></Button>
        <Button variant="outline" asChild><Link href={`/votes/${createdVote.id}/electors`}>선거인 관리</Link></Button>
      </div>
    </WizardCard>
  );
}

function WizardCard({ children, description, title }: { children: React.ReactNode; description: string; title: string }) {
  return <Card className="rounded-lg"><CardHeader><div className="flex flex-wrap items-center gap-2"><CardTitle>{title}</CardTitle><Badge variant="secondary">설정 중</Badge></div><p className="text-sm text-muted-foreground">{description}</p></CardHeader><CardContent>{children}</CardContent></Card>;
}

function Field({ className, label, name, ...props }: { className?: string; label: string; name: string } & React.ComponentProps<typeof Input>) {
  return <label className={`grid gap-2 text-sm font-medium ${className ?? ""}`}>{label}<Input name={name} {...props} /></label>;
}

function CheckOption({ label, ...props }: { label: string } & React.ComponentProps<"input">) {
  return <label className="flex items-center gap-2"><input type="checkbox" className="size-4 rounded border" {...props} />{label}</label>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted p-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 break-all font-medium">{value}</dd></div>;
}

function toFormHandler(handler: (data: FormData) => void, reset = false) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handler(new FormData(event.currentTarget));
    if (reset) event.currentTarget.reset();
  };
}
