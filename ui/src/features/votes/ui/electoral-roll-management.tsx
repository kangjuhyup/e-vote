import { ArrowLeft, ClipboardList, Plus } from "lucide-react";
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
  ElectoralRollPageRecord,
  ElectoralRollRecord,
  ElectoralRollImportMemberInput,
  ElectoralRollMemberDraft,
  ElectoralRollMemberDraftField,
  StageElectoralRollMembersResult,
} from "@/features/votes/model/electoral-roll.types";

import { ElectoralRollList } from "./electoral-roll-list";
import { ElectoralRollMemberSection } from "./electoral-roll-member-section";

interface ElectoralRollManagementProps {
  errorMessage?: string;
  isSubmitting: boolean;
  memberDrafts: ElectoralRollMemberDraft[];
  memberPage: number;
  memberSearchText: string;
  message?: string;
  onAddMember: (data: FormData) => void;
  onImportMembers: (
    members: ElectoralRollImportMemberInput[],
  ) => Promise<StageElectoralRollMembersResult>;
  onMemberChange: (
    draftId: string,
    field: ElectoralRollMemberDraftField,
    value: string,
  ) => void;
  onCreate: (data: FormData) => void;
  onDiscardMemberChanges: () => void;
  onMemberPageChange: (page: number) => void;
  onMemberSearchTextChange: (searchText: string) => void;
  onRemoveMember: (memberId: string) => void;
  onSaveMembers: () => void;
  onRollPageChange: (page: number) => void;
  onSelectRoll: (electoralRollId: string) => void;
  onShowList: () => void;
  pendingChangeCount: number;
  roll: ElectoralRollRecord | null;
  rollPage: ElectoralRollPageRecord;
  selectedRollId: string;
}

export function ElectoralRollManagement({
  errorMessage,
  isSubmitting,
  memberDrafts,
  memberPage,
  memberSearchText,
  message,
  onAddMember,
  onImportMembers,
  onMemberChange,
  onCreate,
  onDiscardMemberChanges,
  onMemberPageChange,
  onMemberSearchTextChange,
  onRemoveMember,
  onSaveMembers,
  onRollPageChange,
  onSelectRoll,
  onShowList,
  pendingChangeCount,
  roll,
  rollPage,
  selectedRollId,
}: ElectoralRollManagementProps) {
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

      {selectedRollId.length === 0 ? (
        <>
          <ElectoralRollList
            page={rollPage}
            onPageChange={onRollPageChange}
            onSelect={onSelectRoll}
          />

          <Card className="rounded-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plus
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <CardTitle className="text-base">독립 명부 생성</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 sm:grid-cols-2 sm:items-end"
                onSubmit={formHandler(onCreate, true)}
              >
                <Field
                  label="선거관리위원회 ID"
                  name="commissionId"
                  defaultValue="commission-1"
                  required
                />
                <Field label="명부 이름" name="name" required />
                <Button
                  type="submit"
                  className="sm:col-span-2"
                  disabled={isSubmitting}
                >
                  <Plus aria-hidden="true" />
                  명부 생성
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      ) : !roll ? (
        <>
          <Button type="button" variant="outline" onClick={onShowList}>
            <ArrowLeft aria-hidden="true" />
            선거인명부 목록
          </Button>
          <EmptyState>선거인명부를 찾을 수 없습니다.</EmptyState>
        </>
      ) : (
        <>
          <Button type="button" variant="outline" onClick={onShowList}>
            <ArrowLeft aria-hidden="true" />
            선거인명부 목록
          </Button>

          <Card className="rounded-lg">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <ClipboardList
                    className="mt-0.5 size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <CardTitle>{roll.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {roll.id}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {pendingChangeCount > 0 ? (
                    <Badge variant="outline">
                      저장 대기 {pendingChangeCount.toLocaleString()}건
                    </Badge>
                  ) : null}
                  <Badge variant="secondary">revision {roll.revision}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Summary label="선거관리위원회 ID" value={roll.commissionId} />
                <Summary
                  label="구성원 수"
                  value={`${memberDrafts.length.toLocaleString()}명`}
                />
              </dl>
            </CardContent>
          </Card>

          <ElectoralRollMemberSection
            members={memberDrafts}
            page={memberPage}
            searchText={memberSearchText}
            isSubmitting={isSubmitting}
            pendingChangeCount={pendingChangeCount}
            onAddMember={onAddMember}
            onImportMembers={onImportMembers}
            onDiscardChanges={onDiscardMemberChanges}
            onMemberChange={onMemberChange}
            onPageChange={onMemberPageChange}
            onRemoveMember={onRemoveMember}
            onSaveMembers={onSaveMembers}
            onSearchTextChange={onMemberSearchTextChange}
          />
        </>
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted px-3 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-medium">{value}</dd>
    </div>
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

function formHandler(
  handler: (data: FormData) => void,
  reset = false,
) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handler(new FormData(event.currentTarget));
    if (reset) event.currentTarget.reset();
  };
}
