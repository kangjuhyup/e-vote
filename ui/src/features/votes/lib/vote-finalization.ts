import type {
  ActiveVoteBillingOrderStatus,
  VoteDetail,
  VoteStatus,
} from "@/features/votes/model/vote.types";

export type VoteBillingLifecycleStatus =
  | ActiveVoteBillingOrderStatus
  | "CANCELED"
  | "REFUNDED";

export type VoteDisplayStatus = VoteStatus | "payment-processing";

export const VOTE_START_TIME_PASSED_MESSAGE =
  "투표 시작 시각이 되었거나 이미 지나 확정할 수 없습니다. 시작 시각을 미래로 변경하세요.";

export function getVoteDisplayStatus(
  voteStatus: VoteStatus,
  billingStatus?: VoteBillingLifecycleStatus,
): VoteDisplayStatus {
  if (billingStatus === "PENDING_PAYMENT") {
    return "payment-processing";
  }
  if (billingStatus === "PAID" || billingStatus === "REFUND_PENDING") {
    return "finalized";
  }
  return voteStatus;
}

export function isVoteSetupEditable(
  voteStatus: VoteStatus,
  billingStatus?: VoteBillingLifecycleStatus,
) {
  if (
    billingStatus === "PENDING_PAYMENT" ||
    billingStatus === "PAID" ||
    billingStatus === "REFUND_PENDING"
  ) {
    return false;
  }
  return voteStatus === "draft" || voteStatus === "scheduled";
}

export function getVoteStartFinalizationIssue(
  startsAt: string,
  now = Date.now(),
) {
  const startsAtTime = Date.parse(startsAt);
  return Number.isFinite(startsAtTime) && startsAtTime <= now
    ? VOTE_START_TIME_PASSED_MESSAGE
    : undefined;
}

export function getVoteFinalizationIssues(vote: VoteDetail, now = Date.now()) {
  const issues: string[] = [];

  const startTimeIssue = getVoteStartFinalizationIssue(vote.startsAt, now);
  if (startTimeIssue) {
    issues.push(startTimeIssue);
  }

  if (vote.title.trim().length === 0) {
    issues.push("투표 제목을 입력하세요.");
  }
  if (!vote.defaultPolicy) {
    issues.push("투표 정책을 저장하세요.");
  }
  if (!vote.votingChannels || vote.votingChannels.length === 0) {
    issues.push("투표 채널을 하나 이상 선택하세요.");
  }
  if (!vote.commissionId) {
    issues.push("선거관리위원회를 지정하세요.");
  }
  if (!vote.electoralRollSnapshotId) {
    issues.push("선거인명부를 연결하세요.");
  }
  if (vote.electorCount < 1) {
    issues.push("유효한 선거인이 1명 이상 필요합니다.");
  }
  if (vote.subVotes.length === 0) {
    issues.push("안건을 하나 이상 등록하세요.");
  } else if (
    vote.subVotes.some(
      (subVote) =>
        subVote.type === "candidate" && subVote.candidates.length < 2,
    )
  ) {
    issues.push("후보형 안건마다 후보를 2명 이상 등록하세요.");
  }

  return issues;
}
