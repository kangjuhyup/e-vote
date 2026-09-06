import { ArrowLeft, Building2, Save, Trash2, UserPlus } from "lucide-react";
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
import type {
  CommissionMemberRecord,
  CommissionRecord,
} from "@/features/votes/model/vote-operations.types";

import { RegistryDeletionDialog } from "./registry-deletion-dialog";

type CommissionDeletionTarget =
  | { kind: "commission"; name: string }
  | { kind: "member"; memberId: string; name: string };

interface CommissionManagementProps {
  commission: CommissionRecord | null;
  commissions: CommissionRecord[];
  deletionTarget?: CommissionDeletionTarget;
  deleteErrorMessage?: string;
  errorMessage?: string;
  isDeleting: boolean;
  isSubmitting: boolean;
  message?: string;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onCreateCommission: (data: FormData) => void;
  onPageChange: (page: number) => void;
  onRegisterMember: (data: FormData) => void;
  onRequestDeleteCommission: () => void;
  onRequestDeleteMember: (member: CommissionMemberRecord) => void;
  onSelectCommission: (commissionId: string) => void;
  onShowList: () => void;
  onUpdateMember: (data: FormData) => void;
  page: number;
  selectedCommissionId: string;
  totalPages: number;
}

export function CommissionManagement({
  commission,
  commissions,
  deletionTarget,
  deleteErrorMessage,
  errorMessage,
  isDeleting,
  isSubmitting,
  message,
  onCancelDelete,
  onConfirmDelete,
  onCreateCommission,
  onPageChange,
  onRegisterMember,
  onRequestDeleteCommission,
  onRequestDeleteMember,
  onSelectCommission,
  onShowList,
  onUpdateMember,
  page,
  selectedCommissionId,
  totalPages,
}: CommissionManagementProps) {
  return (
    <div className="space-y-5">
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground"
        >
          {message}
        </p>
      ) : null}

      {selectedCommissionId.length === 0 ? (
        <CommissionList
          commissions={commissions}
          isSubmitting={isSubmitting}
          onCreateCommission={onCreateCommission}
          onPageChange={onPageChange}
          onSelectCommission={onSelectCommission}
          page={page}
          totalPages={totalPages}
        />
      ) : !commission ? (
        <>
          <Button type="button" variant="outline" onClick={onShowList}>
            <ArrowLeft aria-hidden="true" />
            위원회 목록
          </Button>
          <Card className="rounded-lg">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              선거관리위원회를 찾을 수 없습니다.
            </CardContent>
          </Card>
        </>
      ) : (
        <CommissionDetail
          commission={commission}
          deletionTarget={deletionTarget}
          deleteErrorMessage={deleteErrorMessage}
          isDeleting={isDeleting}
          isSubmitting={isSubmitting}
          onCancelDelete={onCancelDelete}
          onConfirmDelete={onConfirmDelete}
          onRegisterMember={onRegisterMember}
          onRequestDeleteCommission={onRequestDeleteCommission}
          onRequestDeleteMember={onRequestDeleteMember}
          onShowList={onShowList}
          onUpdateMember={onUpdateMember}
        />
      )}
    </div>
  );
}

function CommissionList({
  commissions,
  isSubmitting,
  onCreateCommission,
  onPageChange,
  onSelectCommission,
  page,
  totalPages,
}: {
  commissions: CommissionRecord[];
  isSubmitting: boolean;
  onCreateCommission: (data: FormData) => void;
  onPageChange: (page: number) => void;
  onSelectCommission: (commissionId: string) => void;
  page: number;
  totalPages: number;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
      <section aria-labelledby="commission-list-title" className="space-y-3">
        <h2 id="commission-list-title" className="text-lg font-semibold">
          위원회 목록
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
                  <CardTitle className="text-base">{commission.name}</CardTitle>
                  <Badge variant="secondary">
                    {commission.status === "ACTIVE" ? "활성" : "중지"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  등록 위원 {commission.members.length.toLocaleString()}명
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`${commission.name} 열기`}
                  onClick={() => onSelectCommission(commission.id)}
                >
                  열기
                </Button>
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

      <FormCard icon={<Building2 aria-hidden="true" />} title="위원회 생성">
        <form
          className="space-y-4"
          onSubmit={formHandler(onCreateCommission, true)}
        >
          <Field label="위원회 이름" name="name" required />
          <p className="text-sm leading-6 text-muted-foreground">
            생성 후 해당 위원회 화면에서 위원을 등록합니다.
          </p>
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            위원회 생성
          </Button>
        </form>
      </FormCard>
    </div>
  );
}

function CommissionDetail({
  commission,
  deletionTarget,
  deleteErrorMessage,
  isDeleting,
  isSubmitting,
  onCancelDelete,
  onConfirmDelete,
  onRegisterMember,
  onRequestDeleteCommission,
  onRequestDeleteMember,
  onShowList,
  onUpdateMember,
}: {
  commission: CommissionRecord;
  deletionTarget?: CommissionDeletionTarget;
  deleteErrorMessage?: string;
  isDeleting: boolean;
  isSubmitting: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onRegisterMember: (data: FormData) => void;
  onRequestDeleteCommission: () => void;
  onRequestDeleteMember: (member: CommissionMemberRecord) => void;
  onShowList: () => void;
  onUpdateMember: (data: FormData) => void;
}) {
  return (
    <>
      <Button type="button" variant="outline" onClick={onShowList}>
        <ArrowLeft aria-hidden="true" />
        위원회 목록
      </Button>

      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <CardTitle>{commission.name}</CardTitle>
            </div>
            <Badge variant="secondary">
              {commission.status === "ACTIVE" ? "활성" : "중지"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <section
          aria-labelledby="commission-member-list-title"
          className="space-y-3"
        >
          <div>
            <h2
              id="commission-member-list-title"
              className="text-lg font-semibold"
            >
              위원 목록
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              전체 {commission.members.length.toLocaleString()}명
            </p>
          </div>
          {commission.members.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                등록된 위원이 없습니다.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {commission.members.map((member) => (
                <Card key={member.id} className="rounded-lg">
                  <CardContent className="py-4">
                    <form
                      className="space-y-4"
                      onSubmit={formHandler(onUpdateMember)}
                    >
                      <input type="hidden" name="memberId" value={member.id} />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{member.name}</p>
                        <Badge variant="outline">
                          {member.status === "ACTIVE" ? "활성" : "중지"}
                        </Badge>
                      </div>
                      <Field
                        label="위원 이름"
                        name="name"
                        defaultValue={member.name}
                        aria-label={`${member.name} 위원 이름`}
                        minLength={1}
                        maxLength={100}
                        required
                        disabled={member.status !== "ACTIVE" || isSubmitting}
                      />
                      <label className="grid gap-2 text-sm font-medium">
                        역할
                        <Select
                          name="role"
                          defaultValue={member.role}
                          aria-label={`${member.name} 위원 역할`}
                          disabled={member.status !== "ACTIVE" || isSubmitting}
                        >
                          <option value="ADMIN">관리자</option>
                          <option value="FIELD_MANAGER">현장 관리자</option>
                        </Select>
                      </label>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          aria-label={`${member.name} 위원 변경 저장`}
                          disabled={member.status !== "ACTIVE" || isSubmitting}
                        >
                          <Save aria-hidden="true" />
                          변경 저장
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          aria-label={`${member.name} 위원 삭제`}
                          disabled={member.status !== "ACTIVE" || isSubmitting}
                          onClick={() => onRequestDeleteMember(member)}
                        >
                          <Trash2 aria-hidden="true" />
                          삭제
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <FormCard icon={<UserPlus aria-hidden="true" />} title="위원 등록">
          <form
            className="space-y-4"
            onSubmit={formHandler(onRegisterMember, true)}
          >
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
              disabled={isSubmitting}
            >
              위원 등록
            </Button>
          </form>
        </FormCard>
      </div>

      <Card className="rounded-lg border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="size-5 text-destructive" aria-hidden="true" />
            <CardTitle className="text-base">위원회 삭제</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            위원회는 목록에서 제거되지만 기존 투표와 운영 기록은 유지됩니다.
          </p>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            onClick={onRequestDeleteCommission}
          >
            <Trash2 aria-hidden="true" />
            위원회 삭제
          </Button>
        </CardContent>
      </Card>

      {deletionTarget ? (
        <RegistryDeletionDialog
          title={
            deletionTarget.kind === "commission" ? "위원회 삭제" : "위원 삭제"
          }
          resourceName={deletionTarget.name}
          description={
            deletionTarget.kind === "commission"
              ? "이 위원회를 삭제하시겠습니까? 기존 투표와 운영 기록은 유지됩니다."
              : "이 위원을 삭제하시겠습니까? 위원은 비활성 상태로 전환되며 기존 투표 기록은 유지됩니다. 마지막 활성 관리자는 삭제할 수 없습니다."
          }
          errorMessage={deleteErrorMessage}
          isDeleting={isDeleting}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      ) : null}
    </>
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
    <nav
      aria-label="위원회 목록 페이지"
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
    <Card className="rounded-lg xl:sticky xl:top-5">
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
