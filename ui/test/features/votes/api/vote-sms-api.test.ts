import { describe, expect, it, vi } from "vitest";

import { createVoteSmsApiClient } from "@/features/votes/api/vote-sms-api";

function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: "2026-08-31T00:00:00.000Z",
    }),
    { status },
  );
}

describe("vote sms api", () => {
  it.each([
    ["UPCOMING_VOTE_NOTICE", "upcoming-notice"],
    ["VOTE_PARTICIPATION_REMINDER", "participation-reminder"],
    ["VOTE_RESULT_NOTICE", "result-notice"],
  ] as const)("sends %s to its state-specific endpoint", async (purpose, path) => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        failureCount: 0,
        purpose,
        recipientCount: 2,
        sentAt: "2026-08-31T00:00:00.000Z",
        smsDispatchId: "dispatch-1",
        successCount: 2,
        voteId: "vote/1",
      }),
    );
    const client = createVoteSmsApiClient({
      baseUrl: "https://api.example.com/",
      fetcher,
      mode: "live",
    });

    await expect(
      client.sendVoteSms({
        message: "투표 안내입니다.",
        purpose,
        voteId: "vote/1",
      }),
    ).resolves.toEqual(expect.objectContaining({ id: "dispatch-1", purpose }));
    expect(fetcher).toHaveBeenCalledWith(
      `https://api.example.com/votes/vote%2F1/sms/${path}`,
      expect.objectContaining({
        body: JSON.stringify({ message: "투표 안내입니다." }),
        method: "POST",
      }),
    );
  });

  it("connects the field-session send endpoint", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        failureCount: 1,
        fieldVotingSessionId: "session/1",
        purpose: "FIELD_VOTING_SESSION_NOTICE",
        recipientCount: 2,
        sentAt: "2026-08-31T00:00:00.000Z",
        smsDispatchId: "dispatch-2",
        successCount: 1,
        voteId: "vote-1",
      }),
    );
    const client = createVoteSmsApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });

    await client.sendFieldSessionSms({
      fieldVotingSessionId: "session/1",
      message: "장소 안내입니다.",
      voteId: "vote-1",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/field-voting-sessions/session%2F1/sms",
      expect.objectContaining({
        body: JSON.stringify({ message: "장소 안내입니다." }),
        method: "POST",
      }),
    );
  });

  it("loads dispatch pages and recipient-level details", async () => {
    const fetcher = vi.fn(async (input: string) => {
      if (input.endsWith("/dispatch-1")) {
        return jsonResponse({
          deliveries: [
            {
              electorId: "elector-1",
              recipientIdentifier: "member-1",
              recipientName: "홍*동",
              status: "SUCCESS",
            },
          ],
          failureCount: 0,
          id: "dispatch-1",
          purpose: "UPCOMING_VOTE_NOTICE",
          recipientCount: 1,
          sentAt: "2026-08-31T00:00:00.000Z",
          successCount: 1,
          voteId: "vote-1",
        });
      }
      return jsonResponse({
        items: [],
        page: 2,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      });
    });
    const client = createVoteSmsApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });

    await client.fetchDispatchPage("vote-1", 2, 10);
    await expect(client.fetchDispatch("vote-1", "dispatch-1")).resolves.toEqual(
      expect.objectContaining({
        deliveries: [expect.objectContaining({ recipientName: "홍*동" })],
      }),
    );

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://api.example.com/votes/vote-1/sms/dispatches?page=2&pageSize=10",
      expect.any(Object),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.example.com/votes/vote-1/sms/dispatches/dispatch-1",
      expect.any(Object),
    );
  });

  it("keeps mock messages out of dispatch history", async () => {
    const client = createVoteSmsApiClient({
      mode: "mock",
      now: () => "2026-08-31T00:00:00.000Z",
    });

    const sent = await client.sendVoteSms({
      message: "저장되면 안 되는 본문",
      purpose: "VOTE_PARTICIPATION_REMINDER",
      voteId: "vote-1",
    });
    const detail = await client.fetchDispatch("vote-1", sent.id);

    expect(JSON.stringify(detail)).not.toContain("저장되면 안 되는 본문");
    await expect(client.fetchDispatchPage("vote-1")).resolves.toMatchObject({
      totalItems: 1,
    });
  });
});
