import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  UserPlus,
  UsersRound,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import type {
  ElectorRecord,
  PageResult,
} from "@/features/votes/model/vote-operations.types";

interface ElectorManagementViewProps {
  electoralRollSnapshotId?: string;
  isSubmitting: boolean;
  message?: string;
  onCreate: (formData: FormData) => void;
  onPageChange: (page: number) => void;
  page: PageResult<ElectorRecord>;
}

export function ElectorManagementView({
  electoralRollSnapshotId,
  isSubmitting,
  message,
  onCreate,
  onPageChange,
  page,
}: ElectorManagementViewProps) {
  const isElectoralRollManaged = electoralRollSnapshotId !== undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isElectoralRollManaged) return;
    onCreate(new FormData(event.currentTarget));
    if (!isSubmitting) event.currentTarget.reset();
  }

  return (
    <div className="space-y-5">
      {electoralRollSnapshotId ? (
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <LockKeyhole
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-medium">
                선거인명부에서 관리되는 선거인입니다.
              </p>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {electoralRollSnapshotId}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                연결된 스냅샷에서 선거인이 반영되므로
                이 화면에서 개별 등록할 수 없습니다.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/electoral-rolls">선거인명부 관리</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <section aria-labelledby="elector-list-title" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="elector-list-title" className="text-lg font-semibold">
                등록 선거인
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                총 {page.totalItems.toLocaleString()}명
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {page.page} / {page.totalPages} 페이지
            </div>
          </div>
          <div className="space-y-3">
            {page.items.length === 0 ? (
              <Card className="rounded-lg">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  등록된 선거인이 없습니다.
                </CardContent>
              </Card>
            ) : (
              page.items.map((elector) => (
                <Card key={elector.id} className="rounded-lg">
                  <CardContent className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{elector.name}</p>
                        <Badge
                          variant={
                            elector.status === "ELIGIBLE"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {elector.status === "ELIGIBLE"
                            ? "투표 가능"
                            : "차단"}
                        </Badge>
                        <Badge variant="outline">
                          {elector.identityVerified
                            ? "본인인증 완료"
                            : "본인인증 전"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {elector.identifier}
                        {elector.groupKey ? ` / ${elector.groupKey}` : ""}
                      </p>
                    </div>
                    <div className="text-sm sm:text-right">
                      <p className="font-medium tabular-nums">
                        가중치 {elector.voteWeight.toLocaleString()}
                      </p>
                      {elector.phoneNumber ? (
                        <p className="mt-1 text-muted-foreground">
                          {elector.phoneNumber}
                        </p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page.page <= 1}
              onClick={() => onPageChange(page.page - 1)}
            >
              <ChevronLeft aria-hidden="true" />
              이전
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page.page >= page.totalPages}
              onClick={() => onPageChange(page.page + 1)}
            >
              다음
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </section>

        <Card className="rounded-lg xl:sticky xl:top-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <CardTitle className="text-base">선거인 등록</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <FormField
                label="이름"
                name="name"
                required
                disabled={isElectoralRollManaged}
              />
              <FormField
                label="업무 식별자"
                name="identifier"
                required
                disabled={isElectoralRollManaged}
              />
              <FormField
                label="휴대전화"
                name="phoneNumber"
                inputMode="tel"
                disabled={isElectoralRollManaged}
              />
              <FormField
                label="생년월일"
                name="birthDate"
                placeholder="YYYY-MM-DD"
                disabled={isElectoralRollManaged}
              />
              <FormField
                label="그룹 키"
                name="groupKey"
                disabled={isElectoralRollManaged}
              />
              <FormField
                label="투표 가중치"
                name="voteWeight"
                type="number"
                min="1"
                defaultValue="1"
                required
                disabled={isElectoralRollManaged}
              />
              {message ? (
                <p className="flex items-start gap-2 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {message}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isElectoralRollManaged}
              >
                <UsersRound aria-hidden="true" />
                {isSubmitting ? "등록 중…" : "선거인 등록"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  ...inputProps
}: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input name={name} {...inputProps} />
    </label>
  );
}
