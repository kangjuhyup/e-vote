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
import { ElectoralRollManagementContainer } from "@/features/votes/container/electoral-roll-management-container";
import { SubVoteOperationsContainer } from "@/features/votes/container/sub-vote-operations-container";
import { VoteDetailContainer } from "@/features/votes/container/vote-detail-container";
import { VoteEditContainer } from "@/features/votes/container/vote-edit-container";
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

  it("disables manual elector registration for electoral-roll-managed votes", async () => {
    renderWithQueryClient(
      <ElectorManagementContainer voteId="scheduled-budget" />,
    );

    expect(
      await screen.findByText("선거인명부에서 관리되는 선거인입니다."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "선거인 등록" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("link", { name: "선거인명부 관리" })).toHaveProperty(
      "href",
      expect.stringContaining("/electoral-rolls"),
    );
  });

  it("places the optional commission at the last setup step", async () => {
    renderWithQueryClient(<VoteSetupContainer />);

    expect(
      screen.getByRole("heading", { level: 2, name: "기본 정책" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("투표 제목")).toBeTruthy();
    expect(screen.queryByLabelText("선거인명부 ID")).toBeNull();
    expect(screen.queryByLabelText("투표 운영 위원회")).toBeNull();
    expect(screen.queryByRole("button", { name: "위원회 등록" })).toBeNull();
    expect(screen.queryByRole("button", { name: "위원 등록" })).toBeNull();
    const progress = screen.getByRole("navigation", {
      name: "투표 설정 진행 상태",
    });
    expect(
      Array.from(progress.querySelectorAll("button"), (button) =>
        button.textContent?.trim(),
      ),
    ).toEqual([
      "기본 정책",
      "안건과 후보",
      "선거인명부",
      "운영 위원회",
      "검토",
    ]);
  });

  it("creates commissions and registers members on the commission page", async () => {
    renderWithQueryClient(<CommissionManagementContainer />);

    expect(await screen.findByText("위원회와 위원")).toBeTruthy();
    expect(screen.getByRole("button", { name: "위원회 생성" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "위원 등록" })).toBeTruthy();
    expect(screen.getByText("1 / 1 페이지")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("위원회 이름"), {
      target: { value: "신규 운영" },
    });
    fireEvent.click(screen.getByRole("button", { name: "위원회 생성" }));

    expect(
      await screen.findByText("신규 운영 위원회를 생성했습니다."),
    ).toBeTruthy();
  });

  it("creates a vote by connecting an existing electoral roll", async () => {
    renderWithQueryClient(<VoteSetupContainer />);

    fireEvent.change(screen.getByLabelText("투표 제목"), {
      target: { value: "Mock 신규 투표" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "안건과 후보로 이동" }),
    );

    expect(
      await screen.findByRole("heading", { name: "안건과 후보" }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("안건 제목"), {
      target: { value: "Mock 대표 선출" },
    });
    fireEvent.change(screen.getByLabelText("후보 1"), {
      target: { value: "후보 가" },
    });
    fireEvent.change(screen.getByLabelText("후보 2"), {
      target: { value: "후보 나" },
    });
    fireEvent.click(screen.getByRole("button", { name: "안건 추가" }));

    expect(screen.getByText(/현재 1개 안건을 입력했습니다/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mock 대표 선출" })).toBeTruthy();
    expect(screen.getByText("후보 1 · 후보 가")).toBeTruthy();
    expect(screen.getByText("후보 2 · 후보 나")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("유형"), {
      target: { value: "YES_NO" },
    });
    expect(screen.queryByLabelText("후보 1")).toBeNull();
    expect(screen.queryByLabelText("후보 2")).toBeNull();
    fireEvent.change(screen.getByLabelText("찬반 안건"), {
      target: { value: "Mock 예산 승인" },
    });
    fireEvent.click(screen.getByRole("button", { name: "안건 추가" }));

    expect(screen.getByText(/현재 2개 안건을 입력했습니다/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mock 대표 선출" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mock 예산 승인" })).toBeTruthy();
    expect(screen.getByText("찬성 / 반대")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "선거인명부로 이동" }),
    );

    expect(
      await screen.findByRole("heading", { name: "선거인명부" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "선거인 추가" })).toBeNull();
    const electoralRollSelect = await screen.findByLabelText(
      "연결할 선거인명부",
    );
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "운영 위원회로 이동",
      }).disabled,
    ).toBe(true);
    fireEvent.change(electoralRollSelect, {
      target: { value: "electoral-roll-1" },
    });
    expect(
      (electoralRollSelect as HTMLSelectElement).value,
    ).toBe("electoral-roll-1");
    fireEvent.click(
      screen.getByRole("button", { name: "운영 위원회로 이동" }),
    );

    expect(
      await screen.findByRole("heading", { name: "선거관리위원회" }),
    ).toBeTruthy();
    expect(
      await screen.findByRole("option", { name: "지정하지 않음 (선택)" }),
    ).toBeTruthy();
    expect(
      screen.getByText("선거관리위원회 지정은 선택사항입니다. 필요한 경우에만 선택하세요."),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "투표 생성 후 검토" }),
    );

    expect(
      await screen.findByRole("heading", { name: "설정 검토" }),
    ).toBeTruthy();
    expect(screen.getByText("미지정")).toBeTruthy();
    expect(screen.getByText(/^2개 · /)).toBeTruthy();
    expect(screen.getByText(/2026 상반기 선거인명부 · electoral-roll-1/)).toBeTruthy();
    expect(screen.getByText("electoral-roll-snapshot-1")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "투표 이용료 결제 주문" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/이용료 주문을 생성하려면 활성 위원으로 등록된/),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "이용료 주문 생성 및 투표 확정",
      }),
    ).toHaveProperty("disabled", true);
  });

  it("manages the assigned commission while editing a vote", async () => {
    renderWithQueryClient(<VoteEditContainer voteId="scheduled-budget" />);

    expect(await screen.findByText("투표 기본 설정")).toBeTruthy();
    expect(screen.getByDisplayValue("예산 승인 투표")).toBeTruthy();
    expect(screen.getAllByText("전자투표 운영위원회")).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: "위원 등록" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "위원회 등록" })).toBeNull();
  });

  it("operates field sessions from the vote detail", async () => {
    navigation.pathname = "/votes/active-general";
    renderWithQueryClient(<VoteDetailContainer voteId="active-general" />);

    expect(
      await screen.findByRole("heading", { name: "현장 투표 운영" }),
    ).toBeTruthy();
    expect(await screen.findByText("현장 및 방문 세션")).toBeTruthy();
    expect(await screen.findByText("본관 현장 투표소")).toBeTruthy();
    expect(screen.getByRole("button", { name: "세션 생성" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "현장" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "방문" })).toBeNull();
    expect(screen.queryByLabelText("조회할 투표 ID")).toBeNull();
    expect(screen.queryByRole("link", { name: "현장 운영" })).toBeNull();

    fireEvent.change(screen.getByLabelText("본관 현장 투표소 안내 문자"), {
      target: { value: "본관 1층 운영 시간을 확인해 주세요." },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "본관 현장 투표소 안내 문자 발송",
      }),
    );

    expect(
      await screen.findByText(/총 2명에게 세션 안내 문자를 발송했습니다/),
    ).toBeTruthy();
    expect(screen.getByLabelText("본관 현장 투표소 안내 문자")).toHaveProperty(
      "value",
      "",
    );
  });

  it("sends a state-specific vote message and shows dispatch details", async () => {
    navigation.pathname = "/votes/active-general";
    renderWithQueryClient(<VoteDetailContainer voteId="active-general" />);

    expect(
      await screen.findByRole("heading", { name: "문자 안내" }),
    ).toBeTruthy();
    expect(screen.getByText("참여 독려")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("문자 내용"), {
      target: { value: "아직 참여하지 않은 선거인께 안내드립니다." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "참여 독려 문자 발송" }),
    );

    expect(
      await screen.findByText(/총 2명에게 문자를 발송했습니다/),
    ).toBeTruthy();
    expect(screen.getByLabelText("문자 내용")).toHaveProperty("value", "");
    expect(
      await screen.findByRole("table", { name: "문자 발송 이력" }),
    ).toBeTruthy();
    expect(
      await screen.findByRole("table", { name: "수신자별 문자 발송 결과" }),
    ).toBeTruthy();
    expect(screen.getByText("SIMULATED_RANDOM_FAILURE")).toBeTruthy();
    expect(screen.queryByText("010-****-1201")).toBeNull();
    expect(
      screen.queryByText("아직 참여하지 않은 선거인께 안내드립니다."),
    ).toBeNull();
  });

  it("hides field-session operations for online-only votes", async () => {
    navigation.pathname = "/votes/scheduled-budget";
    renderWithQueryClient(<VoteDetailContainer voteId="scheduled-budget" />);

    expect(await screen.findByText("예산 승인 투표")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "현장 투표 운영" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "세션 생성" })).toBeNull();
  });

  it("manages electoral-roll members without exposing snapshot details", async () => {
    renderWithQueryClient(<ElectoralRollManagementContainer />);

    expect(await screen.findByText("2026 상반기 선거인명부")).toBeTruthy();
    expect(
      screen.getByRole("table", { name: "선거인명부 목록" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("table", {
        name: "명부 구성원 정보 및 수정 기능",
      }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: "2026 상반기 선거인명부 열기",
      }),
    );
    expect(
      await screen.findByRole("button", { name: "선거인명부 목록" }),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("새 구성원 식별자"), {
      target: { value: "new-member" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "구성원 초안 추가" }),
    );

    expect(
      await screen.findByLabelText("new-member 구성원 식별자"),
    ).toHaveProperty("value", "new-member");
    expect(
      screen.getByRole("button", { name: "선거인명부 저장 (1)" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "변경 저장" })).toBeNull();

    fireEvent.change(screen.getByLabelText("member-101 구성원 식별자"), {
      target: { value: "member-101-updated" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "member-102 구성원 제거" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "선거인명부 저장 (3)" }),
    );

    expect(
      await screen.findByText("선거인명부 변경 3건을 저장했습니다."),
    ).toBeTruthy();
    expect(
      await screen.findByLabelText("member-101-updated 구성원 식별자"),
    ).toHaveProperty("value", "member-101-updated");
    expect(screen.queryByLabelText("member-102 구성원 식별자")).toBeNull();
    expect(
      screen.getByRole("table", {
        name: "명부 구성원 정보 및 수정 기능",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "구성원 ID" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "식별자" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "그룹 키" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "투표 가중치" })).toBeTruthy();
    expect(screen.getByLabelText("명부 구성원 검색")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "선거인명부 스냅샷" }),
    ).toBeNull();
    expect(screen.queryByText("최신 revision")).toBeNull();
    expect(screen.queryByRole("button", { name: "스냅샷 생성" })).toBeNull();
    expect(screen.queryByLabelText("연결할 투표 ID")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "투표에 연결" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "선거인명부 목록" }));
    expect(
      await screen.findByRole("table", { name: "선거인명부 목록" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("table", {
        name: "명부 구성원 정보 및 수정 기능",
      }),
    ).toBeNull();
  });

  it("creates a new electoral roll without snapshot guidance", async () => {
    renderWithQueryClient(<ElectoralRollManagementContainer />);

    expect(await screen.findByText("2026 상반기 선거인명부")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("명부 이름"), {
      target: { value: "revision 없는 명부" },
    });
    fireEvent.click(screen.getByRole("button", { name: "명부 생성" }));

    expect(await screen.findByText("revision 없는 명부")).toBeTruthy();
    expect(screen.getByText("revision 1")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "구성원 초안 추가" }),
    ).toBeTruthy();
    expect(
      screen.queryByText("구성원을 한 번 이상 변경하면 첫 스냅샷이 자동 보관됩니다."),
    ).toBeNull();
  });
});
