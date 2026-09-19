import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import type { FormEvent } from "react";
import type { ReactNode } from "react";

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
  ElectoralRollMemberDraft,
  ElectoralRollMemberDraftField,
} from "../model/electoral-roll.types";

const MEMBERS_PER_PAGE = 25;

interface ElectoralRollMemberSectionProps {
  importCard?: ReactNode;
  isSubmitting: boolean;
  members: ElectoralRollMemberDraft[];
  onAddMember: (data: FormData) => boolean | void;
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
  importCard,
  isSubmitting,
  members,
  onAddMember,
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
      member.name,
      member.phoneNumber,
      member.birthDate,
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

      {importCard}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-base">구성원 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <p
            id="electoral-roll-identity-guidance"
            className="mb-4 text-sm leading-6 text-muted-foreground"
          >
            이름과 휴대폰번호는 선택 항목이지만 함께 입력해야 합니다.
            생년월일은 두 항목을 입력한 경우에만 YYYY-MM-DD 형식으로
            입력하세요. 본인인증 투표에 사용할 명부는 모든 선거인의 이름과
            휴대폰번호가 필요합니다. 마스킹된 본인인증 정보를 변경할 때는
            이름과 휴대폰번호를 모두 다시 입력하세요.
          </p>
          <form
            className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 lg:items-end"
            onSubmit={formHandler(onAddMember, true)}
          >
            <Field label="새 구성원 식별자" name="identifier" required />
            <Field
              label="새 구성원 이름"
              name="name"
              autoComplete="off"
              aria-describedby="electoral-roll-identity-guidance"
            />
            <Field
              label="새 구성원 휴대폰번호"
              name="phoneNumber"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="010-1234-5678"
              aria-describedby="electoral-roll-identity-guidance"
            />
            <Field
              label="새 구성원 생년월일"
              name="birthDate"
              inputMode="numeric"
              autoComplete="off"
              placeholder="YYYY-MM-DD"
              aria-describedby="electoral-roll-identity-guidance"
            />
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
              className="md:col-span-2 lg:col-span-3"
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
                  placeholder="식별자, 이름, 휴대폰번호 또는 그룹 키 검색"
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
                  <table className="w-full min-w-[1320px] table-fixed text-left text-sm">
                    <caption className="sr-only">
                      명부 구성원 정보 및 수정 기능
                    </caption>
                    <colgroup>
                      <col className="w-[18%]" />
                      <col className="w-[14%]" />
                      <col className="w-[17%]" />
                      <col className="w-[14%]" />
                      <col className="w-[14%]" />
                      <col className="w-[11%]" />
                      <col className="w-[12%]" />
                    </colgroup>
                    <thead className="border-b bg-muted/50 text-muted-foreground">
                      <tr>
                        <th scope="col" className="py-3 pl-6 pr-3 font-medium">
                          식별자
                        </th>
                        <th scope="col" className="px-3 py-3 font-medium">
                          이름
                        </th>
                        <th scope="col" className="px-3 py-3 font-medium">
                          휴대폰번호
                        </th>
                        <th scope="col" className="px-3 py-3 font-medium">
                          생년월일
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
          aria-label={`${member.identifier} 구성원 이름`}
          aria-describedby="electoral-roll-identity-guidance"
          className="h-9 min-h-9"
          autoComplete="off"
          value={member.name ?? ""}
          onChange={(event) =>
            onMemberChange(member.draftId, "name", event.target.value)
          }
        />
      </td>
      <td className="px-3 py-3 align-middle">
        <Input
          aria-label={`${member.identifier} 구성원 휴대폰번호`}
          aria-describedby="electoral-roll-identity-guidance"
          className="h-9 min-h-9"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={member.phoneNumber ?? ""}
          onChange={(event) =>
            onMemberChange(member.draftId, "phoneNumber", event.target.value)
          }
        />
      </td>
      <td className="px-3 py-3 align-middle">
        <Input
          aria-label={`${member.identifier} 구성원 생년월일`}
          aria-describedby="electoral-roll-identity-guidance"
          className="h-9 min-h-9 tabular-nums"
          inputMode="numeric"
          autoComplete="off"
          placeholder="YYYY-MM-DD"
          value={member.birthDate ?? ""}
          onChange={(event) =>
            onMemberChange(member.draftId, "birthDate", event.target.value)
          }
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
  handler: (data: FormData) => boolean | void,
  reset = false,
) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const shouldReset = handler(new FormData(event.currentTarget)) !== false;
    if (reset && shouldReset) event.currentTarget.reset();
  };
}
