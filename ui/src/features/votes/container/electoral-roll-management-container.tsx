"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { RetryErrorCard } from "@/components/feedback/retry-error-card";
import { SkeletonCardGrid } from "@/components/feedback/skeleton-card-grid";
import { PageShell } from "@/components/layout/page-shell";
import { electoralRollApi } from "@/features/votes/api/electoral-roll-api";
import {
  electoralRollPageQueryOptions,
  electoralRollQueryOptions,
} from "@/features/votes/api/electoral-roll-query-options";
import { isVoteApiMockMode } from "@/features/votes/api/votes-api";
import type {
  ElectoralRollImportMemberInput,
  ElectoralRollMemberDraft,
  ElectoralRollMemberDraftField,
  ElectoralRollMemberRecord,
} from "@/features/votes/model/electoral-roll.types";

import { ElectoralRollManagement } from "../ui/electoral-roll-management";
import { VoteNavigation } from "../ui/vote-navigation";

let memberDraftSequence = 0;

function nextMemberDraftId() {
  memberDraftSequence += 1;
  return `new-member-draft-${memberDraftSequence}`;
}

export function ElectoralRollManagementContainer({
  account,
}: {
  account?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const isMockMode = isVoteApiMockMode();
  const [selectedRollId, setSelectedRollId] = useState("");
  const [rollPage, setRollPage] = useState(1);
  const [memberPage, setMemberPage] = useState(1);
  const [memberSearchText, setMemberSearchText] = useState("");
  const [editedMemberDrafts, setEditedMemberDrafts] =
    useState<ElectoralRollMemberDraft[]>();
  const [message, setMessage] = useState<string>();
  const [draftErrorMessage, setDraftErrorMessage] = useState<string>();
  const rollQuery = useQuery({
    ...electoralRollQueryOptions(selectedRollId),
    enabled: selectedRollId.length > 0,
  });
  const rollPageQuery = useQuery(
    electoralRollPageQueryOptions({ page: rollPage, pageSize: 20 }),
  );
  const memberDrafts =
    editedMemberDrafts ?? rollQuery.data?.members.map(toMemberDraft) ?? [];

  async function refreshRoll(electoralRollId = selectedRollId) {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["electoral-rolls", electoralRollApi.mode, electoralRollId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["electoral-rolls", electoralRollApi.mode, "page"],
      }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: electoralRollApi.createElectoralRoll,
    onSuccess: async (result) => {
      setSelectedRollId(result.id);
      setMemberPage(1);
      setMemberSearchText("");
      setMessage(`${result.name} 명부를 생성했습니다.`);
      await refreshRoll(result.id);
    },
  });
  const saveMembersMutation = useMutation({
    mutationFn: async () => {
      const roll = rollQuery.data;
      if (!roll) throw new Error("선거인명부를 찾을 수 없습니다.");

      const sourceMembersById = new Map(
        roll.members.map((member) => [member.id, member]),
      );
      const retainedMemberIds = new Set(
        memberDrafts.flatMap((draft) =>
          draft.sourceMemberId ? [draft.sourceMemberId] : [],
        ),
      );
      const removedMembers = roll.members.filter(
        (member) => !retainedMemberIds.has(member.id),
      );
      const updatedMembers = memberDrafts.filter((draft) => {
        if (!draft.sourceMemberId) return false;
        const source = sourceMembersById.get(draft.sourceMemberId);
        return source ? !isSameMemberDraft(source, draft) : false;
      });
      const addedMembers = memberDrafts.filter(
        (draft) => !draft.sourceMemberId,
      );

      for (const member of removedMembers) {
        await electoralRollApi.removeMember({
          electoralRollId: roll.id,
          memberId: member.id,
        });
      }
      for (const member of updatedMembers) {
        await electoralRollApi.updateMember({
          electoralRollId: roll.id,
          memberId: member.sourceMemberId!,
          identifier: member.identifier,
          groupKey: member.groupKey,
          voteWeight: member.voteWeight,
        });
      }
      if (addedMembers.length > 0) {
        await electoralRollApi.addMembers({
          electoralRollId: roll.id,
          members: addedMembers.map((member, index) => ({
            identifier: member.identifier,
            groupKey: member.groupKey,
            voteWeight: member.voteWeight,
            rowNumber: index + 1,
          })),
        });
      }

      return {
        electoralRollId: roll.id,
        changeCount:
          removedMembers.length + updatedMembers.length + addedMembers.length,
      };
    },
    onSuccess: async ({ changeCount, electoralRollId }) => {
      setMessage(
        `선거인명부 변경 ${changeCount.toLocaleString()}건을 저장했습니다.`,
      );
      setMemberPage(1);
      setMemberSearchText("");
      await refreshRoll(electoralRollId);
      setEditedMemberDrafts(undefined);
    },
    onError: async () => {
      await refreshRoll();
      setEditedMemberDrafts(undefined);
    },
  });
  const mutationError = createMutation.error ?? saveMembersMutation.error;
  const isSubmitting = createMutation.isPending || saveMembersMutation.isPending;
  const pendingChangeCount = countMemberDraftChanges(
    rollQuery.data?.members ?? [],
    memberDrafts,
  );

  function clearStatus() {
    setMessage(undefined);
    setDraftErrorMessage(undefined);
    createMutation.reset();
    saveMembersMutation.reset();
  }

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation current="electoral-rolls" isMockMode={isMockMode} />
      }
      eyebrow="선거인 관리"
      title="선거인명부 관리"
      description="선거인명부와 구성원을 관리합니다."
    >
      {selectedRollId.length === 0 && rollPageQuery.isLoading ? (
        <SkeletonCardGrid count={3} label="선거인명부 목록을 불러오는 중…" />
      ) : selectedRollId.length > 0 && rollQuery.isLoading ? (
        <SkeletonCardGrid count={4} label="선거인명부를 불러오는 중…" />
      ) : selectedRollId.length === 0 && rollPageQuery.isError ? (
        <RetryErrorCard
          title="선거인명부 목록을 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => rollPageQuery.refetch()}
        />
      ) : selectedRollId.length > 0 && rollQuery.isError ? (
        <RetryErrorCard
          title="선거인명부를 불러오지 못했습니다."
          description="잠시 후 다시 시도하세요."
          onRetry={() => rollQuery.refetch()}
        />
      ) : (
        <ElectoralRollManagement
          roll={rollQuery.data ?? null}
          rollPage={
            rollPageQuery.data ?? {
              items: [],
              page: rollPage,
              pageSize: 20,
              totalItems: 0,
              totalPages: 1,
            }
          }
          selectedRollId={selectedRollId}
          memberPage={memberPage}
          memberDrafts={memberDrafts}
          memberSearchText={memberSearchText}
          pendingChangeCount={pendingChangeCount}
          isSubmitting={isSubmitting}
          message={message}
          errorMessage={
            draftErrorMessage ??
            (mutationError instanceof Error ? mutationError.message : undefined)
          }
          onSelectRoll={(id) => {
            setSelectedRollId(id.trim());
            setMemberPage(1);
            setMemberSearchText("");
            setEditedMemberDrafts(undefined);
            clearStatus();
          }}
          onShowList={() => {
            setSelectedRollId("");
            setMemberPage(1);
            setMemberSearchText("");
            setEditedMemberDrafts(undefined);
            clearStatus();
          }}
          onRollPageChange={setRollPage}
          onMemberPageChange={setMemberPage}
          onMemberSearchTextChange={(searchText) => {
            setMemberPage(1);
            setMemberSearchText(searchText);
          }}
          onCreate={(data) => {
            clearStatus();
            createMutation.mutate({
              commissionId: String(data.get("commissionId") ?? ""),
              name: String(data.get("name") ?? ""),
            });
          }}
          onAddMember={(data) => {
            clearStatus();
            try {
              stageMembers([
                {
                  identifier: String(data.get("identifier") ?? ""),
                  groupKey: String(data.get("groupKey") ?? "") || undefined,
                  voteWeight: Number(data.get("voteWeight") ?? 1),
                  rowNumber: 0,
                },
              ]);
            } catch (error) {
              setDraftErrorMessage(
                error instanceof Error ? error.message : "구성원을 확인하세요.",
              );
            }
          }}
          onImportMembers={(members) => {
            clearStatus();
            return Promise.resolve(stageMembers(members));
          }}
          onDiscardMemberChanges={() => {
            clearStatus();
            setEditedMemberDrafts(undefined);
            setMemberPage(1);
            setMemberSearchText("");
          }}
          onMemberChange={(draftId, field, value) => {
            clearStatus();
            setEditedMemberDrafts((current) =>
              (current ?? memberDrafts).map((draft) =>
                draft.draftId === draftId
                  ? updateMemberDraft(draft, field, value)
                  : draft,
              ),
            );
          }}
          onRemoveMember={(draftId) => {
            clearStatus();
            setEditedMemberDrafts((current) =>
              (current ?? memberDrafts).filter(
                (draft) => draft.draftId !== draftId,
              ),
            );
          }}
          onSaveMembers={() => {
            clearStatus();
            const validationMessage = validateMemberDrafts(memberDrafts);
            if (validationMessage) {
              setDraftErrorMessage(validationMessage);
              return;
            }
            saveMembersMutation.mutate();
          }}
        />
      )}
    </PageShell>
  );

  function stageMembers(members: ElectoralRollImportMemberInput[]) {
    const nextDrafts = members.map((member) => ({
      draftId: nextMemberDraftId(),
      identifier: member.identifier,
      groupKey: member.groupKey,
      voteWeight: member.voteWeight,
    }));
    const validationMessage = validateMemberDrafts([
      ...memberDrafts,
      ...nextDrafts,
    ]);
    if (validationMessage) throw new Error(validationMessage);

    setEditedMemberDrafts((current) => [
      ...(current ?? memberDrafts),
      ...nextDrafts,
    ]);
    setMemberPage(Math.max(1, Math.ceil((memberDrafts.length + 1) / 25)));
    setMemberSearchText("");
    setMessage(
      `구성원 ${nextDrafts.length.toLocaleString()}명을 저장 대기 목록에 추가했습니다.`,
    );
    return { stagedMemberCount: nextDrafts.length };
  }
}

function toMemberDraft(member: ElectoralRollMemberRecord): ElectoralRollMemberDraft {
  return {
    draftId: member.id,
    sourceMemberId: member.id,
    identifier: member.identifier,
    groupKey: member.groupKey,
    voteWeight: member.voteWeight,
  };
}

function updateMemberDraft(
  draft: ElectoralRollMemberDraft,
  field: ElectoralRollMemberDraftField,
  value: string,
): ElectoralRollMemberDraft {
  if (field === "voteWeight") return { ...draft, voteWeight: Number(value) };
  if (field === "groupKey") return { ...draft, groupKey: value || undefined };
  return { ...draft, identifier: value };
}

function isSameMemberDraft(
  source: ElectoralRollMemberRecord,
  draft: ElectoralRollMemberDraft,
) {
  return (
    source.identifier === draft.identifier &&
    (source.groupKey ?? "") === (draft.groupKey ?? "") &&
    source.voteWeight === draft.voteWeight
  );
}

function countMemberDraftChanges(
  sourceMembers: ElectoralRollMemberRecord[],
  drafts: ElectoralRollMemberDraft[],
) {
  const sourceById = new Map(sourceMembers.map((member) => [member.id, member]));
  const retainedIds = new Set(
    drafts.flatMap((draft) =>
      draft.sourceMemberId ? [draft.sourceMemberId] : [],
    ),
  );
  const removedCount = sourceMembers.filter(
    (member) => !retainedIds.has(member.id),
  ).length;
  const changedCount = drafts.filter((draft) => {
    if (!draft.sourceMemberId) return true;
    const source = sourceById.get(draft.sourceMemberId);
    return source ? !isSameMemberDraft(source, draft) : false;
  }).length;
  return removedCount + changedCount;
}

function validateMemberDrafts(drafts: ElectoralRollMemberDraft[]) {
  const identifiers = new Set<string>();
  for (const draft of drafts) {
    const identifier = draft.identifier.trim();
    if (!identifier) return "모든 구성원의 식별자를 입력하세요.";
    if (!Number.isFinite(draft.voteWeight) || draft.voteWeight <= 0) {
      return `${identifier} 구성원의 투표 가중치를 확인하세요.`;
    }
    if (identifiers.has(identifier)) {
      return `${identifier} 식별자가 중복되었습니다.`;
    }
    identifiers.add(identifier);
  }
  return undefined;
}
