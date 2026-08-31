import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import type { FormEvent } from "react";

import { SearchField } from "@/components/forms/search-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  ElectoralRollImportMemberInput,
  ElectoralRollMemberDraft,
  ElectoralRollMemberDraftField,
  StageElectoralRollMembersResult,
} from "../model/electoral-roll.types";
import { ElectoralRollImportCard } from "./electoral-roll-import-card";

const MEMBERS_PER_PAGE = 25;

interface ElectoralRollMemberSectionProps {
  isSubmitting: boolean;
  members: ElectoralRollMemberDraft[];
  onAddMember: (data: FormData) => void;
  onImportMembers: (
    members: ElectoralRollImportMemberInput[],
  ) => Promise<StageElectoralRollMembersResult>;
  onDiscardChanges: () => void;
  onMemberChange: (
    draftId: string,
    field: ElectoralRollMemberDraftField,
    value: string,
  ) => void;
  onPageChange: (page: number) => void;
  onRemoveMember: (memberId: string) => void;
  onSaveMembers: () => void;
  onSearchTextChange: (searchText: string) => void;
  page: number;
  pendingChangeCount: number;
  searchText: string;
}

export function ElectoralRollMemberSection({
  isSubmitting,
  members,
  onAddMember,
  onImportMembers,
  onDiscardChanges,
  onMemberChange,
  onPageChange,
  onRemoveMember,
  onSaveMembers,
  onSearchTextChange,
  page,
  pendingChangeCount,
  searchText,
}: ElectoralRollMemberSectionProps) {
  const normalizedSearchText = searchText.trim().toLocaleLowerCase();
  const filteredMembers = members.filter((member) => {
    if (normalizedSearchText.length === 0) return true;

    return [
      member.identifier,
      member.groupKey,
      member.sourceMemberId,
      member.draftId,
    ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearchText));
  });
  const pageCount = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBERS_PER_PAGE),
  );
  const currentPage = Math.min(pageCount, Math.max(1, page));
  const firstMemberIndex = (currentPage - 1) * MEMBERS_PER_PAGE;
  const visibleMembers = filteredMembers.slice(
    firstMemberIndex,
    firstMemberIndex + MEMBERS_PER_PAGE,
  );

  return (
    <section aria-labelledby="electoral-roll-members-title" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="electoral-roll-members-title" className="text-lg font-semibold">
            명부 구성원
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            추가·수정·삭제 내용을 모은 뒤 선거인명부를 한 번에 저장합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || pendingChangeCount === 0}
            onClick={onDiscardChanges}
          >
            <RotateCcw aria-hidden="true" />
            변경 취소
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || pendingChangeCount === 0}
            onClick={onSaveMembers}
          >
            <Save aria-hidden="true" />
            {isSubmitting
              ? "저장 중…"
              : `선거인명부 저장${
                  pendingChangeCount > 0 ? ` (${pendingChangeCount})` : ""
                }`}
          </Button>
        </div>
      </div>

      <ElectoralRollImportCard
        isSubmitting={isSubmitting}
        onImportMembers={onImportMembers}
      />

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">구성원 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-3 sm:items-end"
            onSubmit={formHandler(onAddMember, true)}
          >
            <Field label="새 구성원 식별자" name="identifier" required />
            <Field label="새 구성원 그룹 키" name="groupKey" />
            <Field
              label="새 구성원 투표 가중치"
              name="voteWeight"
              type="number"
              min="0.000001"
              step="any"
              defaultValue="1"
              required
            />
            <Button
              type="submit"
              className="sm:col-span-3"
              disabled={isSubmitting}
            >
              <Plus aria-hidden="true" />
              구성원 초안 추가
            </Button>
          </form>
        </CardContent>
      </Card>

      {members.length === 0 ? (
        <Card className="rounded-lg">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            등록된 구성원이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 overflow-hidden rounded-lg py-0">
          <CardHeader className="border-b py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <CardTitle className="text-base">구성원 목록</CardTitle>
                <p
                  className="mt-1 text-sm tabular-nums text-muted-foreground"
                  aria-live="polite"
                >
                  {normalizedSearchText.length > 0
                    ? `검색 ${filteredMembers.length.toLocaleString()}명 / 전체 ${members.length.toLocaleString()}명`
                    : `전체 ${members.length.toLocaleString()}명`}
                </p>
              </div>
              <div className="w-full md:max-w-sm">
                <SearchField
                  label="명부 구성원 검색"
                  name="memberSearch"
                  placeholder="식별자, 그룹 키 또는 ID 검색"
                  value={searchText}
                  onValueChange={onSearchTextChange}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-0">
            {filteredMembers.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                검색 조건에 맞는 구성원이 없습니다.
              </p>
            ) : (
              <>
                <p className="px-6 pt-4 text-xs text-muted-foreground md:hidden">
                  표를 좌우로 이동해 전체 열을 확인할 수 있습니다.
                </p>
                <div
                  className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  role="region"
                  aria-label="명부 구성원 표"
                  tabIndex={0}
                >
                  <table className="w-full min-w-[960px] table-fixed text-left text-sm">
                    <caption className="sr-only">
                      명부 구성원 정보 및 수정 기능
                    </caption>
                    <colgroup>
                      <col className="w-[21%]" />
                      <col className="w-[24%]" />
                      <col className="w-[22%]" />
                      <col className="w-[15%]" />
                      <col className="w-[18%]" />
                    </colgroup>
                    <thead className="border-b bg-muted/50 text-muted-foreground">
                      <tr>
                        <th scope="col" className="py-3 pl-6 pr-3 font-medium">
                          구성원 ID
                        </th>
                        <th scope="col" className="px-3 py-3 font-medium">
                          식별자
                        </th>
                        <th scope="col" className="px-3 py-3 font-medium">
                          그룹 키
                        </th>
                        <th scope="col" className="px-3 py-3 font-medium">
                          투표 가중치
                        </th>
                        <th scope="col" className="py-3 pl-3 pr-6 text-right font-medium">
                          관리
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {visibleMembers.map((member) => (
                        <MemberTableRow
                          key={member.draftId}
                          member={member}
                          isSubmitting={isSubmitting}
                          onMemberChange={onMemberChange}
                          onRemoveMember={onRemoveMember}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <nav
                  aria-label="명부 구성원 페이지"
                  className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {`${(firstMemberIndex + 1).toLocaleString()}-${Math.min(
                      firstMemberIndex + MEMBERS_PER_PAGE,
                      filteredMembers.length,
                    ).toLocaleString()} / ${filteredMembers.length.toLocaleString()}명`}
                  </p>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => onPageChange(currentPage - 1)}
                    >
                      <ChevronLeft aria-hidden="true" />
                      이전
                    </Button>
                    <span className="min-w-14 text-center text-sm tabular-nums">
                      {currentPage} / {pageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage === pageCount}
                      onClick={() => onPageChange(currentPage + 1)}
                    >
                      다음
                      <ChevronRight aria-hidden="true" />
                    </Button>
                  </div>
                </nav>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function MemberTableRow({
  isSubmitting,
  member,
  onMemberChange,
  onRemoveMember,
}: {
  isSubmitting: boolean;
  member: ElectoralRollMemberDraft;
  onMemberChange: (
    draftId: string,
    field: ElectoralRollMemberDraftField,
    value: string,
  ) => void;
  onRemoveMember: (memberId: string) => void;
}) {
  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="py-3 pl-6 pr-3 align-middle">
        <span
          className="block truncate font-mono text-xs text-muted-foreground"
          title={member.sourceMemberId ?? "저장 대기"}
        >
          {member.sourceMemberId ?? "저장 후 생성"}
        </span>
      </td>
      <td className="px-3 py-3 align-middle">
        <Input
          aria-label={`${member.identifier} 구성원 식별자`}
          className="h-9 min-h-9"
          value={member.identifier}
          onChange={(event) =>
            onMemberChange(member.draftId, "identifier", event.target.value)
          }
          required
        />
      </td>
      <td className="px-3 py-3 align-middle">
        <Input
          aria-label={`${member.identifier} 구성원 그룹 키`}
          className="h-9 min-h-9"
          value={member.groupKey ?? ""}
          onChange={(event) =>
            onMemberChange(member.draftId, "groupKey", event.target.value)
          }
        />
      </td>
      <td className="px-3 py-3 align-middle">
        <Input
          aria-label={`${member.identifier} 구성원 투표 가중치`}
          className="h-9 min-h-9 tabular-nums"
          type="number"
          min="0.000001"
          step="any"
          value={member.voteWeight}
          onChange={(event) =>
            onMemberChange(member.draftId, "voteWeight", event.target.value)
          }
          required
        />
      </td>
      <td className="py-3 pl-3 pr-6 align-middle">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="float-right text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={isSubmitting}
          aria-label={`${member.identifier} 구성원 제거`}
          onClick={() => onRemoveMember(member.draftId)}
        >
          <Trash2 aria-hidden="true" />
          제거
        </Button>
      </td>
    </tr>
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
