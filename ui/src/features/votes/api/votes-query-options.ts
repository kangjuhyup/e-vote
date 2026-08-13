import { queryOptions } from "@tanstack/react-query";

import {
  buildVoteDashboard,
  findVoteDetail,
} from "@/features/votes/model/vote-selectors";
import type {
  VoteDashboard,
  VoteDetail,
  VoteSummary,
} from "@/features/votes/model/vote.types";

const MOCK_DELAY_MS = 120;

const mockVoteDetails: VoteDetail[] = [
  {
    id: "active-general",
    title: "2026 상반기 대표 선출",
    description:
      "전자투표 운영위원회 대표 후보를 선출하는 진행 중 투표입니다.",
    status: "active",
    startsAt: "2026-08-10T09:00:00.000Z",
    endsAt: "2026-08-20T09:00:00.000Z",
    electorCount: 100,
    participatedCount: 72,
    candidates: [
      {
        id: "candidate-1",
        name: "김대표",
        description: "투표 운영 자동화와 감사 추적 강화를 제안합니다.",
        order: 1,
      },
      {
        id: "candidate-2",
        name: "박운영",
        description: "선거인 지원 프로세스 개선을 제안합니다.",
        order: 2,
      },
    ],
    electors: [
      {
        id: "elector-1",
        name: "이선거",
        label: "운영팀",
        participated: true,
        participatedAt: "2026-08-11T02:00:00.000Z",
      },
      {
        id: "elector-2",
        name: "박미참",
        label: "재무팀",
        participated: false,
        participatedAt: null,
      },
      {
        id: "elector-3",
        name: "정참여",
        label: "감사팀",
        participated: true,
        participatedAt: "2026-08-12T04:20:00.000Z",
      },
    ],
  },
  {
    id: "scheduled-budget",
    title: "예산 승인 투표",
    description: "하반기 전자투표 시스템 예산 집행안을 승인합니다.",
    status: "scheduled",
    startsAt: "2026-09-01T09:00:00.000Z",
    endsAt: "2026-09-05T09:00:00.000Z",
    electorCount: 50,
    participatedCount: 0,
    candidates: [
      {
        id: "candidate-budget-1",
        name: "예산안 찬성",
        description: "제출된 예산안을 승인합니다.",
        order: 1,
      },
      {
        id: "candidate-budget-2",
        name: "예산안 반대",
        description: "제출된 예산안을 반려합니다.",
        order: 2,
      },
    ],
    electors: [
      {
        id: "elector-4",
        name: "최예정",
        label: "기획팀",
        participated: false,
        participatedAt: null,
      },
    ],
  },
  {
    id: "completed-policy",
    title: "운영 규정 개정 투표",
    description: "투표 운영 규정 개정안을 확정한 종료 투표입니다.",
    status: "completed",
    startsAt: "2026-07-01T09:00:00.000Z",
    endsAt: "2026-07-07T09:00:00.000Z",
    electorCount: 80,
    participatedCount: 64,
    candidates: [
      {
        id: "candidate-policy-1",
        name: "개정안 승인",
        description: "운영 규정 개정안을 승인합니다.",
        order: 1,
      },
      {
        id: "candidate-policy-2",
        name: "현행 유지",
        description: "기존 운영 규정을 유지합니다.",
        order: 2,
      },
    ],
    electors: [
      {
        id: "elector-5",
        name: "한완료",
        label: "법무팀",
        participated: true,
        participatedAt: "2026-07-02T03:10:00.000Z",
      },
    ],
  },
];

async function waitForMockData() {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function toVoteSummary(vote: VoteDetail): VoteSummary {
  return {
    id: vote.id,
    title: vote.title,
    status: vote.status,
    startsAt: vote.startsAt,
    endsAt: vote.endsAt,
    electorCount: vote.electorCount,
    participatedCount: vote.participatedCount,
  };
}

async function fetchVoteDashboard(): Promise<VoteDashboard> {
  await waitForMockData();

  return buildVoteDashboard(mockVoteDetails, new Date().toISOString());
}

async function fetchVoteList(): Promise<VoteSummary[]> {
  await waitForMockData();

  return mockVoteDetails.map(toVoteSummary);
}

async function fetchVoteDetail(voteId: string): Promise<VoteDetail | null> {
  await waitForMockData();

  return findVoteDetail(mockVoteDetails, voteId);
}

export function voteDashboardQueryOptions() {
  return queryOptions({
    queryKey: ["votes", "dashboard"],
    queryFn: fetchVoteDashboard,
  });
}

export function voteListQueryOptions() {
  return queryOptions({
    queryKey: ["votes", "list"],
    queryFn: fetchVoteList,
  });
}

export function voteDetailQueryOptions(voteId: string) {
  return queryOptions({
    queryKey: ["votes", "detail", voteId],
    queryFn: () => fetchVoteDetail(voteId),
  });
}
