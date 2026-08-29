/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useVotesUiStore } from "@/features/votes/store/votes-ui.store";

import { VoteDashboardContainer } from "@/features/votes/container/vote-dashboard-container";
import { VoteDetailContainer } from "@/features/votes/container/vote-detail-container";
import { VoteListContainer } from "@/features/votes/container/vote-list-container";

const queryClients: QueryClient[] = [];

function renderWithQueryClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });

  queryClients.push(queryClient);

  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

describe("vote containers", () => {
  beforeEach(() => {
    useVotesUiStore.getState().resetVotesUi();
  });

  afterEach(() => {
    cleanup();
    queryClients.splice(0).forEach((queryClient) => queryClient.clear());
  });

  it("renders dashboard data from React Query", async () => {
    renderWithQueryClient(<VoteDashboardContainer />);

    expect(await screen.findByText("현재 진행 중인 투표")).toBeTruthy();
    expect(await screen.findAllByText("2026 상반기 대표 선출")).toHaveLength(2);
  });

  it("filters the vote list by status", async () => {
    renderWithQueryClient(<VoteListContainer />);

    expect(await screen.findByText("2026 상반기 대표 선출")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "예정" }));

    expect(screen.getByText("예산 승인 투표")).toBeTruthy();
    expect(screen.queryByText("2026 상반기 대표 선출")).toBeNull();
  });

  it("renders a not-found state for an unknown vote detail id", async () => {
    renderWithQueryClient(<VoteDetailContainer voteId="missing" />);

    expect(await screen.findByText("투표를 찾을 수 없습니다.")).toBeTruthy();
  });
});
