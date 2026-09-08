import {
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  Link2,
  Send,
  Trash2,
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
import type {
  ParticipationInvitationDevelopmentLink,
  ParticipationInvitationDispatchResult,
} from "@/features/votes/model/participation-invitation.types";

import { ElectorDeletionDialog } from "./elector-deletion-dialog";
import { ParticipationLinkDialog } from "./participation-link-dialog";

interface ElectorManagementViewProps {
  canDispatchInvitations: boolean;
  canDeleteElectors: boolean;
  deletingElector?: ElectorRecord;
  deletionError?: string;
  developmentLink?: ParticipationInvitationDevelopmentLink;
  developmentLinkError?: string;
  electoralRollSnapshotId?: string;
  isDeleting: boolean;
  isSubmitting: boolean;
  invitation?: ParticipationInvitationDispatchResult;
  invitationElector?: ElectorRecord;
  invitationError?: string;
  isIssuingInvitation: boolean;
  isDispatchingInvitations: boolean;
  isLoadingDevelopmentLink: boolean;
  dispatchError?: string;
  message?: string;
  onCancelDelete: () => void;
  onCreate: (formData: FormData) => void;
  onCloseInvitation: () => void;
  onConfirmDelete: () => void;
  onIssueInvitation: () => void;
  onDispatchInvitations: () => void;
  onOpenInvitation: (elector: ElectorRecord) => void;
  onPageChange: (page: number) => void;
  onRequestDelete: (elector: ElectorRecord) => void;
  page: PageResult<ElectorRecord>;
  showDevelopmentLink: boolean;
}

export function ElectorManagementView({
  canDispatchInvitations,
  canDeleteElectors,
  deletingElector,
  deletionError,
  developmentLink,
  developmentLinkError,
  electoralRollSnapshotId,
  isDeleting,
  isSubmitting,
  invitation,
  invitationElector,
  invitationError,
  isIssuingInvitation,
  isDispatchingInvitations,
  isLoadingDevelopmentLink,
  dispatchError,
  message,
  onCancelDelete,
  onCloseInvitation,
  onConfirmDelete,
  onCreate,
  onIssueInvitation,
  onDispatchInvitations,
  onOpenInvitation,
  onPageChange,
  onRequestDelete,
  page,
  showDevelopmentLink,
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
      {message ? (
        <p className="rounded-md bg-accent px-4 py-3 text-sm text-accent-foreground">
          {message}
        </p>
      ) : null}
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
              <p className="mt-1 text-sm text-muted-foreground">
                연결된 스냅샷에서 선거인이 반영되므로
                이 화면에서 개별 등록하거나 삭제할 수 없습니다.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/electoral-rolls">선거인명부 관리</Link>
          </Button>
        </div>
      ) : null}

      <Card className="rounded-lg border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium">영구 참여 링크 문자 발송</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              투표가 확정된 뒤 본인인증이 필요 없는 선거의 투표 가능 선거인에게 참여 링크를 발송합니다.
            </p>
            {dispatchError ? <p role="alert" className="mt-2 text-sm text-destructive">{dispatchError}</p> : null}
          </div>
          <Button
            type="button"
            className="shrink-0"
            disabled={!canDispatchInvitations || isDispatchingInvitations}
            title={canDispatchInvitations ? undefined : '확정·진행·종료 상태이며 본인인증이 필요 없는 투표에서 사용할 수 있습니다.'}
            onClick={onDispatchInvitations}
          >
            <Send aria-hidden="true" />
            {isDispatchingInvitations ? '발송 예약 중…' : '전체 문자 발송 예약'}
          </Button>
        </CardContent>
      </Card>

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
                    <div className="flex flex-col items-start gap-3 text-sm sm:items-end sm:text-right">
                      <div>
                        <p className="font-medium tabular-nums">
                          가중치 {elector.voteWeight.toLocaleString()}
                        </p>
                        {elector.phoneNumber ? (
                          <p className="mt-1 text-muted-foreground">
                            {elector.phoneNumber}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!canDispatchInvitations || elector.status !== "ELIGIBLE"}
                          title={
                            canDispatchInvitations && elector.status === "ELIGIBLE"
                              ? undefined
                              : "현재 상태에서 이 선거인의 참여 링크를 재발급할 수 없습니다."
                          }
                          onClick={() => onOpenInvitation(elector)}
                        >
                          <Link2 aria-hidden="true" />
                          링크 재발급
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`${elector.name} 선거인 삭제`}
                          disabled={
                            !canDeleteElectors ||
                            elector.status !== "ELIGIBLE" ||
                            isDeleting
                          }
                          title={
                            !canDeleteElectors
                              ? "결제가 시작되지 않은 초안의 직접 등록 선거인만 삭제할 수 있습니다."
                              : elector.status !== "ELIGIBLE"
                                ? "이미 차단된 선거인입니다."
                                : undefined
                          }
                          onClick={() => onRequestDelete(elector)}
                        >
                          <Trash2 aria-hidden="true" />
                          삭제
                        </Button>
                      </div>
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

      {invitationElector ? (
        <ParticipationLinkDialog
          elector={invitationElector}
          result={invitation}
          error={invitationError}
          developmentLink={developmentLink}
          developmentLinkError={developmentLinkError}
          isLoadingDevelopmentLink={isLoadingDevelopmentLink}
          showDevelopmentLink={showDevelopmentLink}
          isIssuing={isIssuingInvitation}
          onClose={onCloseInvitation}
          onIssue={onIssueInvitation}
        />
      ) : null}
      {deletingElector ? (
        <ElectorDeletionDialog
          elector={deletingElector}
          errorMessage={deletionError}
          isDeleting={isDeleting}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      ) : null}
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
