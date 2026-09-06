import { Building2, UserPlus } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import type { CommissionRecord } from "@/features/votes/model/vote-operations.types";

interface VoteCommissionSetupProps {
  allowCreate?: boolean;
  commissions: CommissionRecord[];
  isLoading?: boolean;
  isSubmitting: boolean;
  message?: string;
  onCommissionChange?: (commissionId: string) => void;
  onCreateCommission?: (data: FormData) => void;
  onRegisterMember?: (data: FormData) => void;
  selectedCommissionId?: string;
  selectionRequired?: boolean;
}

export function VoteCommissionSetup({
  allowCreate = true,
  commissions,
  isLoading = false,
  isSubmitting,
  message,
  onCommissionChange,
  onCreateCommission,
  onRegisterMember,
  selectedCommissionId,
  selectionRequired = true,
}: VoteCommissionSetupProps) {
  const isSelectionOnly = !onCreateCommission && !onRegisterMember;
  const selectedCommission = commissions.find(
    (commission) => commission.id === selectedCommissionId,
  );

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <CardTitle>선거관리위원회</CardTitle>
          </div>
          {selectedCommission ? (
            <Badge variant="secondary">
              {selectedCommission.status === "ACTIVE" ? "활성" : "중지"}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {isSelectionOnly
            ? selectionRequired
              ? "미리 등록한 위원회 중 이 투표를 운영할 위원회를 선택합니다."
              : "선거관리위원회 지정은 선택사항입니다. 필요한 경우에만 선택하세요."
            : "이 투표를 운영할 위원회를 확인하고 필요한 위원을 등록합니다."}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {message ? (
          <p className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
            {message}
          </p>
        ) : null}

        <label className="grid gap-2 text-sm font-medium">
          투표 운영 위원회
          <Select
            aria-label="투표 운영 위원회"
            value={selectedCommissionId ?? ""}
            disabled={isLoading || !onCommissionChange}
            onChange={(event) => onCommissionChange?.(event.target.value)}
          >
            <option value="" disabled={selectionRequired}>
              {isLoading
                ? "위원회 불러오는 중…"
                : selectionRequired
                  ? "위원회를 선택하세요"
                  : "지정하지 않음 (선택)"}
            </option>
            {commissions.map((commission) => (
              <option key={commission.id} value={commission.id}>
                {commission.name}
              </option>
            ))}
          </Select>
        </label>

        {isSelectionOnly ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              {selectionRequired
                ? "사용할 위원회가 없다면 위원회 관리에서 먼저 등록하세요."
                : "위원회 지정 없이도 투표를 생성할 수 있습니다."}
            </p>
            <Button type="button" variant="outline" asChild>
              <Link href="/commissions">위원회 관리</Link>
            </Button>
          </div>
        ) : null}

        {selectedCommission ? (
          <div className="rounded-md border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{selectedCommission.name}</p>
              <span className="text-sm text-muted-foreground">
                등록 위원 {selectedCommission.members.length}명
              </span>
            </div>
            {selectedCommission.members.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCommission.members.map((member) => (
                  <Badge key={member.id} variant="outline">
                    {member.name} ·{" "}
                    {member.role === "ADMIN" ? "관리자" : "현장 관리자"}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {onCreateCommission || onRegisterMember ? (
          <div
            className={allowCreate ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}
          >
          {allowCreate && onCreateCommission ? (
            <form
              className="space-y-3 rounded-md border p-4"
              onSubmit={formHandler(onCreateCommission, true)}
            >
              <div className="flex items-center gap-2 font-medium">
                <Building2 className="size-4" aria-hidden="true" />
                새 위원회 등록
              </div>
              <Field label="위원회 이름" name="name" required />
              <Button type="submit" disabled={isSubmitting} className="w-full">
                위원회 등록
              </Button>
            </form>
          ) : null}

            {onRegisterMember ? (
              <form
                className="space-y-3 rounded-md border p-4"
                onSubmit={formHandler(onRegisterMember, true)}
              >
                <div className="flex items-center gap-2 font-medium">
                  <UserPlus className="size-4" aria-hidden="true" />
                  위원 등록
                </div>
                <input
                  type="hidden"
                  name="commissionId"
                  value={selectedCommissionId ?? ""}
                />
                <Field label="위원 이름" name="name" required />
                <label className="grid gap-2 text-sm font-medium">
                  역할
                  <Select name="role" defaultValue="FIELD_MANAGER">
                    <option value="ADMIN">관리자</option>
                    <option value="FIELD_MANAGER">현장 관리자</option>
                  </Select>
                </label>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSubmitting || !selectedCommissionId}
                  className="w-full"
                >
                  위원 등록
                </Button>
              </form>
            ) : null}
          </div>
        ) : null}
      </CardContent>
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
