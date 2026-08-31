import { Building2, UserPlus } from "lucide-react";
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
import type { CommissionRecord } from "@/features/votes/model/vote-operations.types";

interface CommissionManagementProps {
  commissions: CommissionRecord[];
  isSubmitting: boolean;
  message?: string;
  onCreateCommission: (data: FormData) => void;
  onPageChange: (page: number) => void;
  onRegisterMember: (data: FormData) => void;
  page: number;
  totalPages: number;
}

export function CommissionManagement({
  commissions,
  isSubmitting,
  message,
  onCreateCommission,
  onPageChange,
  onRegisterMember,
  page,
  totalPages,
}: CommissionManagementProps) {
  return (
    <div className="space-y-5">
      {message ? (
        <p className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
          {message}
        </p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <section aria-labelledby="commission-list-title" className="space-y-3">
          <h2 id="commission-list-title" className="text-lg font-semibold">
            위원회와 위원
          </h2>
          {commissions.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                조회 가능한 위원회가 없습니다.
              </CardContent>
            </Card>
          ) : (
            commissions.map((commission) => (
              <Card key={commission.id} className="rounded-lg">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {commission.name}
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {commission.id}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {commission.status === "ACTIVE" ? "활성" : "중지"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {commission.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      등록된 위원이 없습니다.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {commission.members.map((member) => (
                        <div
                          key={member.id}
                          className="rounded-md bg-muted px-3 py-3 text-sm"
                        >
                          <p className="font-medium">{member.name}</p>
                          <p className="mt-1 text-muted-foreground">
                            {member.role === "ADMIN"
                              ? "관리자"
                              : "현장 관리자"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
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
        <div className="space-y-4 xl:sticky xl:top-5">
          <FormCard icon={<Building2 aria-hidden="true" />} title="위원회 생성">
            <form
              className="space-y-4"
              onSubmit={formHandler(onCreateCommission, true)}
            >
              <Field label="위원회 이름" name="name" required />
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                위원회 생성
              </Button>
            </form>
          </FormCard>
          <FormCard icon={<UserPlus aria-hidden="true" />} title="위원 등록">
            <form
              className="space-y-4"
              onSubmit={formHandler(onRegisterMember, true)}
            >
              <label className="grid gap-2 text-sm font-medium">
                위원회
                <Select name="commissionId" required defaultValue="">
                  <option value="" disabled>
                    위원회를 선택하세요
                  </option>
                  {commissions.map((commission) => (
                    <option key={commission.id} value={commission.id}>
                      {commission.name}
                    </option>
                  ))}
                </Select>
              </label>
              <Field label="위원 이름" name="name" required />
              <label className="grid gap-2 text-sm font-medium">
                역할
                <Select name="role" defaultValue="FIELD_MANAGER">
                  <option value="ADMIN">관리자</option>
                  <option value="FIELD_MANAGER">현장 관리자</option>
                </Select>
              </label>
              <Button
                className="w-full"
                type="submit"
                variant="outline"
                disabled={isSubmitting || commissions.length === 0}
              >
                위원 등록
              </Button>
            </form>
          </FormCard>
        </div>
      </div>
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
  const displayedTotalPages = Math.max(1, totalPages);

  return (
    <nav aria-label="위원회 목록 페이지" className="flex items-center justify-between gap-3">
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
        {page} / {displayedTotalPages} 페이지
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

function FormCard({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <CardTitle className="text-base text-foreground">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input name={name} {...props} />
    </label>
  );
}

function formHandler(handler: (data: FormData) => void, reset = false) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handler(new FormData(event.currentTarget));
    if (reset) event.currentTarget.reset();
  };
}
