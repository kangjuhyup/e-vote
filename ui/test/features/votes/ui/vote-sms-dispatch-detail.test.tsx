/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { SmsDispatchDetail } from "@/features/votes/model/vote-sms.types";
import { VoteSmsDispatchDetail } from "@/features/votes/ui/vote-sms-dispatch-detail";

const reminderDispatch: SmsDispatchDetail = {
  deliveries: [
    {
      electorId: "elector-success",
      recipientIdentifier: "member-101",
      recipientName: "김선거",
      status: "SUCCESS",
    },
    {
      electorId: "elector-failure",
      failureReason: "SIMULATED_RANDOM_FAILURE",
      recipientIdentifier: "member-102",
      recipientName: "이선거",
      status: "FAILURE",
    },
  ],
  failureCount: 1,
  id: "dispatch-1",
  page: 1,
  pageSize: 50,
  purpose: "VOTE_PARTICIPATION_REMINDER",
  recipientCount: 2,
  sentAt: "2026-09-08T12:00:00.000Z",
  successCount: 1,
  totalItems: 2,
  totalPages: 1,
  voteId: "vote-1",
};

describe("VoteSmsDispatchDetail", () => {
  afterEach(cleanup);

  it("shows a development link action only for successful reminder recipients", () => {
    render(
      <VoteSmsDispatchDetail
        dispatch={reminderDispatch}
        onPageChange={() => undefined}
        onOpenParticipationLink={() => undefined}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "참여 링크" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "김선거 참여 링크 보기" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "이선거 참여 링크 보기" }),
    ).toBeNull();
  });

  it("does not show participation links for other SMS purposes", () => {
    render(
      <VoteSmsDispatchDetail
        dispatch={{ ...reminderDispatch, purpose: "UPCOMING_VOTE_NOTICE" }}
        onPageChange={() => undefined}
        onOpenParticipationLink={() => undefined}
      />,
    );

    expect(
      screen.queryByRole("columnheader", { name: "참여 링크" }),
    ).toBeNull();
  });

  it("shows a readable reason for simulated delivery failures", () => {
    render(
      <VoteSmsDispatchDetail
        dispatch={reminderDispatch}
        onPageChange={() => undefined}
      />,
    );

    expect(screen.getByText("문자 발송에 실패했습니다.")).toBeTruthy();
    expect(screen.queryByText("SIMULATED_RANDOM_FAILURE")).toBeNull();
  });
});
