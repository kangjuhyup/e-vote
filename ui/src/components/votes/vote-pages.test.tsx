/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useVotesUiStore } from "@/features/votes/store/votes-ui.store";

import { VoteDashboardPage } from "./vote-dashboard-page";
import { VoteDetailPage } from "./vote-detail-page";
import { VoteListPage } from "./vote-list-page";

function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

describe("vote pages", () => {
  beforeEach(() => {
    useVotesUiStore.getState().resetVotesUi();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders dashboard data from React Query", async () => {
    renderWithQueryClient(<VoteDashboardPage />);

    expect(await screen.findByText("현재 진행 중인 투표")).toBeTruthy();
    expect(await screen.findAllByText("2026 상반기 대표 선출")).toHaveLength(2);
  });

  it("filters the vote list by status", async () => {
    renderWithQueryClient(<VoteListPage />);

    expect(await screen.findByText("2026 상반기 대표 선출")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "예정" }));

    expect(screen.getByText("예산 승인 투표")).toBeTruthy();
    expect(screen.queryByText("2026 상반기 대표 선출")).toBeNull();
  });

  it("renders a not-found state for an unknown vote detail id", async () => {
    renderWithQueryClient(<VoteDetailPage voteId="missing" />);

    expect(await screen.findByText("투표를 찾을 수 없습니다.")).toBeTruthy();
  });
});
