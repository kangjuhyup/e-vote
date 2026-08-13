import type {
  ElectorParticipationFilter,
  VoteCandidate,
  VoteElector,
  VoteStatus,
  VoteStatusFilter,
} from "@/features/votes/model/vote.types";

export const voteStatusFilterOptions = [
  { value: "all", label: "전체" },
  { value: "active", label: "진행 중" },
  { value: "scheduled", label: "예정" },
  { value: "completed", label: "종료" },
  { value: "draft", label: "초안" },
  { value: "canceled", label: "취소" },
] satisfies Array<{ value: VoteStatusFilter; label: string }>;

export const electorParticipationFilterOptions = [
  { value: "all", label: "전체" },
  { value: "participated", label: "참여" },
  { value: "not-participated", label: "미참여" },
] satisfies Array<{ value: ElectorParticipationFilter; label: string }>;

const voteStatusLabels = {
  active: "진행 중",
  scheduled: "예정",
  completed: "종료",
  draft: "초안",
  canceled: "취소",
} satisfies Record<VoteStatus, string>;

const voteStatusVariants = {
  active: "default",
  scheduled: "secondary",
  completed: "outline",
  draft: "secondary",
  canceled: "destructive",
} as const satisfies Record<
  VoteStatus,
  "default" | "secondary" | "outline" | "destructive"
>;

export function getVoteStatusLabel(status: VoteStatus) {
  return voteStatusLabels[status];
}

export function getVoteStatusVariant(status: VoteStatus) {
  return voteStatusVariants[status];
}

export function toCandidateItems(candidates: VoteCandidate[]) {
  return [...candidates]
    .sort((left, right) => left.order - right.order)
    .map((candidate) => ({
      id: candidate.id,
      title: candidate.name,
      description: candidate.description,
      order: candidate.order,
    }));
}

function getElectorParticipationStatus(
  elector: VoteElector,
): "participated" | "not-participated" | "unknown" {
  if (!elector.participationKnown) {
    return "unknown";
  }

  return elector.participated ? "participated" : "not-participated";
}

export function toRosterItems(electors: VoteElector[]) {
  return electors.map((elector) => ({
    id: elector.id,
    label: elector.label,
    name: elector.name,
    participated: elector.participated,
    participatedAt: elector.participatedAt,
    participationStatus: getElectorParticipationStatus(elector),
  }));
}
