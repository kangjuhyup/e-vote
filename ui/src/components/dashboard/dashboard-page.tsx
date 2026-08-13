"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { ActivityList } from "@/components/dashboard/activity-list";
import { MetricCard } from "@/components/dashboard/metric-card";
import { OperationsPanel } from "@/components/dashboard/operations-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardMetricsQueryOptions } from "@/features/dashboard/api/dashboard-query-options";
import { useDashboardUiStore } from "@/features/dashboard/store/dashboard-ui.store";

export function DashboardPage() {
  const density = useDashboardUiStore((state) => state.density);
  const statusFilter = useDashboardUiStore((state) => state.statusFilter);
  const setDensity = useDashboardUiStore((state) => state.setDensity);
  const setStatusFilter = useDashboardUiStore((state) => state.setStatusFilter);

  const dashboardMetricsQuery = useQuery(dashboardMetricsQueryOptions());
  const dashboardMetrics = dashboardMetricsQuery.data;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-4 border-b pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Badge variant="secondary">Vote Operations</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal">
              전자투표 운영 대시보드
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              투표 진행 상태, 본인인증 대기열, 집계 준비 상황을 한 화면에서
              확인합니다.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => dashboardMetricsQuery.refetch()}
            disabled={dashboardMetricsQuery.isFetching}
          >
            <RefreshCw
              className={dashboardMetricsQuery.isFetching ? "animate-spin" : ""}
              aria-hidden="true"
            />
            새로고침
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {dashboardMetricsQuery.isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="space-y-4">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-8 w-16 rounded bg-muted" />
                    <div className="h-4 w-32 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))
            : dashboardMetrics?.metrics.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <OperationsPanel
            density={density}
            statusFilter={statusFilter}
            onDensityChange={setDensity}
            onStatusFilterChange={setStatusFilter}
          />
          <ActivityList
            activities={dashboardMetrics?.activities ?? []}
            density={density}
          />
        </section>

        <footer className="text-sm text-muted-foreground">
          현재 필터: {statusFilter} / 화면 밀도: {density}
        </footer>
      </div>
    </main>
  );
}
