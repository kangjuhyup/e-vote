/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ElectoralRollMemberDraft } from "@/features/votes/model/electoral-roll.types";
import { ElectoralRollMemberSection } from "@/features/votes/ui/electoral-roll-member-section";

const members: ElectoralRollMemberDraft[] = Array.from(
  { length: 26 },
  (_, index) => ({
    birthDate: index === 0 ? "1990-**-**" : undefined,
    draftId: `member-id-${index + 1}`,
    groupKey: `group-${index + 1}`,
    identifier: `member-${index + 1}`,
    name: index === 0 ? "김*표" : undefined,
    phoneNumber: index === 0 ? "010-****-1201" : undefined,
    sourceMemberId: `member-id-${index + 1}`,
    voteWeight: 1,
  }),
);

describe("ElectoralRollMemberSection", () => {
  afterEach(cleanup);

  it("renders at most 25 editable table rows and supports paging", () => {
    const onPageChange = vi.fn();
    const props = {
      isSubmitting: false,
      members,
      onAddMember: vi.fn(),
      onDiscardChanges: vi.fn(),
      onImportMembers: vi.fn(),
      onMemberChange: vi.fn(),
      onPageChange,
      onRemoveMember: vi.fn(),
      onSaveMembers: vi.fn(),
      onSearchTextChange: vi.fn(),
      page: 1,
      pendingChangeCount: 0,
      searchText: "",
    };
    const view = render(<ElectoralRollMemberSection {...props} />);

    expect(screen.getAllByRole("row")).toHaveLength(26);
    expect(
      screen.queryByRole("columnheader", { name: "구성원 ID" }),
    ).toBeNull();
    expect(screen.queryByText("member-id-1")).toBeNull();
    expect(screen.getByRole("columnheader", { name: "이름" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "휴대폰번호" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "생년월일" })).toBeTruthy();
    expect(screen.getByLabelText("member-1 구성원 이름")).toHaveProperty(
      "value",
      "김*표",
    );
    expect(screen.getByLabelText("member-1 구성원 휴대폰번호")).toHaveProperty(
      "value",
      "010-****-1201",
    );
    expect(screen.getByLabelText("member-1 구성원 생년월일")).toHaveProperty(
      "value",
      "1990-**-**",
    );
    expect(screen.getByText("1-25 / 26명")).toBeTruthy();
    expect(screen.queryByLabelText("member-26 구성원 식별자")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    view.rerender(<ElectoralRollMemberSection {...props} page={2} />);
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByLabelText("member-26 구성원 식별자")).toBeTruthy();
    expect(screen.getByText("26-26 / 26명")).toBeTruthy();
  });

  it("edits drafts and saves every pending change from one button", () => {
    const onDiscardChanges = vi.fn();
    const onMemberChange = vi.fn();
    const onSaveMembers = vi.fn();
    render(
      <ElectoralRollMemberSection
        isSubmitting={false}
        members={members.slice(0, 2)}
        onAddMember={vi.fn()}
        onDiscardChanges={onDiscardChanges}
        onImportMembers={vi.fn()}
        onMemberChange={onMemberChange}
        onPageChange={vi.fn()}
        onRemoveMember={vi.fn()}
        onSaveMembers={onSaveMembers}
        onSearchTextChange={vi.fn()}
        page={1}
        pendingChangeCount={2}
        searchText=""
      />,
    );

    fireEvent.change(screen.getByLabelText("member-1 구성원 식별자"), {
      target: { value: "member-1-updated" },
    });
    expect(onMemberChange).toHaveBeenCalledWith(
      "member-id-1",
      "identifier",
      "member-1-updated",
    );
    fireEvent.change(screen.getByLabelText("member-1 구성원 이름"), {
      target: { value: "김대표" },
    });
    expect(onMemberChange).toHaveBeenCalledWith(
      "member-id-1",
      "name",
      "김대표",
    );
    expect(screen.queryByRole("button", { name: "변경 저장" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "변경 취소" }));
    expect(onDiscardChanges).toHaveBeenCalledOnce();

    fireEvent.click(
      screen.getByRole("button", { name: "선거인명부 저장 (2)" }),
    );
    expect(onSaveMembers).toHaveBeenCalledOnce();
  });
});
