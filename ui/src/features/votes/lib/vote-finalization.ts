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

export function getVoteFinalizationIssues(vote: VoteDetail) {
  const issues: string[] = [];

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
