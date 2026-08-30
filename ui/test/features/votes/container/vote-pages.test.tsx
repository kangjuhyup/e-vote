/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useVotesUiStore } from "@/features/votes/store/votes-ui.store";

import { VoteDashboardContainer } from "@/features/votes/container/vote-dashboard-container";
import { CommissionManagementContainer } from "@/features/votes/container/commission-management-container";
import { ElectorManagementContainer } from "@/features/votes/container/elector-management-container";
import { FieldSessionContainer } from "@/features/votes/container/field-session-container";
import { SubVoteOperationsContainer } from "@/features/votes/container/sub-vote-operations-container";
import { VoteDetailContainer } from "@/features/votes/container/vote-detail-container";
import { VoteListContainer } from "@/features/votes/container/vote-list-container";
import { VoteSetupContainer } from "@/features/votes/container/vote-setup-container";

const navigation = vi.hoisted(() => ({
  pathname: "/votes",
  replace: vi.fn(),
  search: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

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
    navigation.pathname = "/votes";
    navigation.search = "";
    navigation.replace.mockReset();
    useVotesUiStore.getState().resetVotesUi();
  });

  afterEach(() => {
    cleanup();
    queryClients.splice(0).forEach((queryClient) => queryClient.clear());
  });

  it("renders dashboard data from React Query", async () => {
    renderWithQueryClient(<VoteDashboardContainer />);

    expect(screen.getByLabelText("Mock API 및 인증 사용 중")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "투표 생성" }).getAttribute("href"),
    ).toBe("/votes/new");
    expect(await screen.findByText("현재 진행 중인 투표")).toBeTruthy();
    expect(await screen.findAllByText("2026 상반기 대표 선출")).toHaveLength(2);
  });

  it("filters the vote list by status", async () => {
    renderWithQueryClient(<VoteListContainer />);

    expect(await screen.findByText("2026 상반기 대표 선출")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "예정" }));

    expect(screen.getByText("예산 승인 투표")).toBeTruthy();
    expect(screen.queryByText("2026 상반기 대표 선출")).toBeNull();
    expect(navigation.replace).toHaveBeenCalledWith("/votes?status=scheduled", {
      scroll: false,
    });
  });

  it("hydrates vote list filters from URL search params", async () => {
    navigation.search = "status=scheduled&q=%EC%98%88%EC%82%B0";

    renderWithQueryClient(<VoteListContainer />);

    expect(await screen.findByDisplayValue("예산")).toBeTruthy();
    expect(await screen.findByText("예산 승인 투표")).toBeTruthy();
    expect(screen.queryByText("2026 상반기 대표 선출")).toBeNull();
  });

  it("resets filters from an empty filtered result", async () => {
    renderWithQueryClient(<VoteListContainer />);

    const searchInput = await screen.findByRole("searchbox", {
      name: "투표 제목 검색",
    });
    fireEvent.change(searchInput, { target: { value: "존재하지 않음" } });

    fireEvent.click(await screen.findByRole("button", { name: "필터 초기화" }));

    await waitFor(() => {
      expect(screen.getByText("2026 상반기 대표 선출")).toBeTruthy();
    });
    expect(navigation.replace).toHaveBeenLastCalledWith("/votes", {
      scroll: false,
    });
  });

  it("renders a not-found state for an unknown vote detail id", async () => {
    navigation.pathname = "/votes/missing";
    renderWithQueryClient(<VoteDetailContainer voteId="missing" />);

    expect(await screen.findByText("투표를 찾을 수 없습니다.")).toBeTruthy();
  });

  it("renders child-vote turnout and result operations", async () => {
    renderWithQueryClient(
      <SubVoteOperationsContainer
        voteId="active-general"
        voteDetailId="representative-election"
      />,
    );

    expect(await screen.findByText("대표 후보 선출")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "투표율" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "후보와 선택지" }),
    ).toBeTruthy();
  });

  it("renders elector management with the registration form", async () => {
    renderWithQueryClient(
      <ElectorManagementContainer voteId="active-general" />,
    );

    expect(await screen.findByText("등록 선거인")).toBeTruthy();
    expect(screen.getByRole("button", { name: "선거인 등록" })).toBeTruthy();
  });

  it("renders the vote setup wizard without voter ballot controls", () => {
    renderWithQueryClient(<VoteSetupContainer />);

    expect(
      screen.getByRole("heading", { level: 2, name: "기본 정책" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("투표 제목")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "투표하기" })).toBeNull();
  });

  it("creates a vote and child vote through the mock setup flow", async () => {
    renderWithQueryClient(<VoteSetupContainer />);

    fireEvent.change(screen.getByLabelText("투표 제목"), {
      target: { value: "Mock 신규 투표" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "투표 생성 후 계속" }),
    );

    expect(
      await screen.findByRole("heading", { name: "안건과 후보" }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("자식 투표 제목"), {
      target: { value: "Mock 대표 선출" },
    });
    fireEvent.change(screen.getByLabelText("후보 1"), {
      target: { value: "후보 가" },
    });
    fireEvent.change(screen.getByLabelText("후보 2"), {
      target: { value: "후보 나" },
    });
    fireEvent.click(screen.getByRole("button", { name: "안건과 후보 등록" }));

    expect(
      await screen.findByRole("heading", { name: "선거인" }),
    ).toBeTruthy();
  });

  it("renders commission and field-session operation screens", async () => {
    const commissionView = renderWithQueryClient(
      <CommissionManagementContainer />,
    );
    expect(await screen.findByText("위원회와 위원")).toBeTruthy();
    expect(screen.getByRole("button", { name: "위원회 생성" })).toBeTruthy();
    commissionView.unmount();

    renderWithQueryClient(<FieldSessionContainer />);
    expect(await screen.findByText("현장 및 방문 세션")).toBeTruthy();
    expect(screen.getByRole("button", { name: "세션 생성" })).toBeTruthy();
  });
});
