/* @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ElectoralRollImportCard } from "@/features/votes/ui/electoral-roll-import-card";

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  parse: vi.fn(),
}));

vi.mock("@/features/votes/lib/electoral-roll-workbook", () => ({
  downloadElectoralRollTemplate: mocks.download,
  parseElectoralRollWorkbook: mocks.parse,
}));

describe("ElectoralRollImportCard", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.download.mockReset();
    mocks.parse.mockReset();
  });

  it("downloads the template and submits a validated workbook", async () => {
    const members = [
      {
        identifier: "employee-001",
        groupKey: "seoul",
        rowNumber: 2,
        voteWeight: 1,
      },
    ];
    mocks.download.mockResolvedValue(undefined);
    mocks.parse.mockResolvedValue({ errors: [], members });
    const onImportMembers = vi.fn().mockResolvedValue({
      stagedMemberCount: 1,
    });
    render(
      <ElectoralRollImportCard
        isSubmitting={false}
        onImportMembers={onImportMembers}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "템플릿 다운로드" }));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce());

    fireEvent.change(screen.getByLabelText("작성한 엑셀 파일"), {
      target: { files: [new File(["xlsx"], "members.xlsx")] },
    });
    expect(await screen.findByText("1명 등록 준비 완료")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "검증한 구성원 초안 추가" }),
    );
    await waitFor(() =>
      expect(onImportMembers).toHaveBeenCalledWith(members),
    );
    expect(
      await screen.findByText("구성원 1명을 저장 대기 목록에 추가했습니다."),
    ).toBeTruthy();
  });

  it("blocks invalid rows and reports an atomic bulk request failure", async () => {
    mocks.parse
      .mockResolvedValueOnce({
        errors: [{ rowNumber: 3, message: "구성원 식별자를 입력하세요." }],
        members: [],
      })
      .mockResolvedValueOnce({
        errors: [],
        members: [
          {
            identifier: "employee-001",
            rowNumber: 2,
            voteWeight: 1,
          },
        ],
      });
    const onImportMembers = vi
      .fn()
      .mockRejectedValue(new Error("Vote API request failed: 409"));
    render(
      <ElectoralRollImportCard
        isSubmitting={false}
        onImportMembers={onImportMembers}
      />,
    );
    const input = screen.getByLabelText("작성한 엑셀 파일");

    fireEvent.change(input, {
      target: { files: [new File(["invalid"], "invalid.xlsx")] },
    });
    expect(await screen.findByText("3행: 구성원 식별자를 입력하세요.")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "검증한 구성원 초안 추가",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    fireEvent.change(input, {
      target: { files: [new File(["valid"], "valid.xlsx")] },
    });
    expect(await screen.findByText("1명 등록 준비 완료")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "검증한 구성원 초안 추가" }),
    );

    expect(
      await screen.findByText(
        "구성원을 초안에 추가하지 못했습니다. 내용을 확인하세요.",
      ),
    ).toBeTruthy();
  });

  it("shows an indeterminate status while one bulk request is running", async () => {
    mocks.parse.mockResolvedValue({
      errors: [],
      members: [
        { identifier: "employee-001", rowNumber: 2, voteWeight: 1 },
        { identifier: "employee-002", rowNumber: 3, voteWeight: 1 },
      ],
    });
    let finishImport: ((result: { stagedMemberCount: number }) => void) |
      undefined;
    const onImportMembers = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        finishImport = resolve;
      });
    });
    render(
      <ElectoralRollImportCard
        isSubmitting={false}
        onImportMembers={onImportMembers}
      />,
    );

    fireEvent.change(screen.getByLabelText("작성한 엑셀 파일"), {
      target: { files: [new File(["xlsx"], "members.xlsx")] },
    });
    expect(await screen.findByText("2명 등록 준비 완료")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "검증한 구성원 초안 추가" }),
    );

    expect(
      await screen.findByText(
        "구성원 2명을 저장 대기 목록에 추가하는 중입니다.",
      ),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("progressbar", { name: "구성원 초안 추가 중" })
        .hasAttribute("aria-valuenow"),
    ).toBe(false);

    finishImport?.({
      stagedMemberCount: 2,
    });
    expect(
      await screen.findByText("구성원 2명을 저장 대기 목록에 추가했습니다."),
    ).toBeTruthy();
  });
});
