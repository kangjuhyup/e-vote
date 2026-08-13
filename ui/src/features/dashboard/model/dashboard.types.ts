export type VoteStatusFilter = "all" | "draft" | "open" | "closed" | "canceled";

export type DashboardDensity = "comfortable" | "compact";

export interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
  tone: "default" | "success" | "warning";
}

export interface DashboardActivity {
  id: string;
  title: string;
  detail: string;
  status: "stable" | "attention" | "pending";
}

export interface DashboardMetrics {
  metrics: DashboardMetric[];
  activities: DashboardActivity[];
  generatedAt: string;
}
