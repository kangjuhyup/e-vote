import { queryOptions } from "@tanstack/react-query";

import type { DashboardMetrics } from "../model/dashboard.types";

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  await new Promise((resolve) => setTimeout(resolve, 150));

  return {
    generatedAt: new Date().toISOString(),
    metrics: [
      { label: "진행 중 투표", value: "12", delta: "+3", tone: "success" },
      {
        label: "본인인증 대기",
        value: "248",
        delta: "18분 평균",
        tone: "warning",
      },
      { label: "집계 완료", value: "37", delta: "오늘 5건", tone: "default" },
    ],
    activities: [
      {
        id: "vote-open",
        title: "정기 주주총회 의안 투표",
        detail: "공개 투표 / 후보 4명 / 참여율 68%",
        status: "stable",
      },
      {
        id: "identity-review",
        title: "본인인증 재시도 증가",
        detail: "모바일 인증 제공자 응답 지연",
        status: "attention",
      },
      {
        id: "secret-ballot",
        title: "비밀 투표 집계 준비",
        detail: "선택 후보 비저장 정책 적용",
        status: "pending",
      },
    ],
  };
}

export function dashboardMetricsQueryOptions() {
  return queryOptions({
    queryKey: ["dashboard", "metrics"],
    queryFn: fetchDashboardMetrics,
  });
}
