/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FieldSessionManagement } from "@/features/votes/ui/field-session-management";

afterEach(cleanup);

describe("FieldSessionManagement", () => {
  it("shows manager names while retaining their IDs in the submitted data", () => {
    const onCreate = vi.fn();

    render(
      <FieldSessionManagement
        allowedChannels={["ONSITE"]}
        commissionId="commission-1"
        isManagersLoading={false}
        isSubmitting={false}
        managers={[
          {
            id: "commission-member-1",
            name: "김관리",
            role: "ADMIN",
            status: "ACTIVE",
          },
          {
            id: "commission-member-2",
            name: "오현장",
            role: "FIELD_MANAGER",
            status: "ACTIVE",
          },
        ]}
        onChangeStatus={vi.fn()}
        onCreate={onCreate}
        onPageChange={vi.fn()}
        onSendSms={vi.fn()}
        onSmsDraftChange={vi.fn()}
        page={1}
        sessions={[]}
        smsDrafts={{}}
        smsEnabled
        totalPages={0}
      />,
    );

    expect(screen.queryByText("commission-1")).toBeNull();
    expect(screen.queryByText("commission-member-1")).toBeNull();
    expect(screen.queryByLabelText("관리자 ID")).toBeNull();

    fireEvent.click(screen.getByLabelText("김관리 · 관리자"));
    fireEvent.click(screen.getByLabelText("오현장 · 현장 관리자"));
    fireEvent.submit(
      screen.getByRole("button", { name: "세션 생성" }).closest("form")!,
    );

    const submitted = onCreate.mock.calls[0]?.[0] as FormData;
    expect(submitted.getAll("managerIds")).toEqual([
      "commission-member-1",
      "commission-member-2",
    ]);
  });
});
