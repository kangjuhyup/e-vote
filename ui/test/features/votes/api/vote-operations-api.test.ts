import { describe, expect, it, vi } from "vitest";

import { createVoteOperationsApiClient } from "@/features/votes/api/vote-operations-api";

function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: "2026-08-30T00:00:00.000Z",
    }),
    { status },
  );
}

describe("vote operations api", () => {
  it("keeps operations and mutations in memory without calling live APIs in mock mode", async () => {
    const fetcher = vi.fn();
    const client = createVoteOperationsApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "mock",
    });

    await expect(
      client.fetchSubVoteOperations(
        "active-general",
        "representative-election",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        status: "OPEN",
        title: "대표 후보 선출",
      }),
    );

    const commission = await client.createCommission("테스트 선거관리위원회");
    await expect(client.fetchCommissions()).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ id: commission.id }),
        ]),
        readAvailable: true,
      }),
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses the documented vote creation endpoint and request body in live mode", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        commissionId: "commission-1",
        id: "vote-created",
        status: "DRAFT",
      }),
    );
    const client = createVoteOperationsApiClient({
      baseUrl: "https://api.example.com/",
      fetcher,
      mode: "live",
    });
    const input = {
      commissionId: "commission-1",
      defaultPolicy: {
        participationUnit: "INDIVIDUAL" as const,
        privacyMode: "SECRET" as const,
        resultStorageMode: "DATABASE" as const,
        voteWeightMode: "EQUAL" as const,
      },
      identityVerificationPolicy: { required: false },
      title: "2026 대표 선출",
      votingChannels: ["ONLINE" as const],
    };

    await expect(client.createVote(input)).resolves.toEqual(
      expect.objectContaining({ id: "vote-created" }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/votes",
      expect.objectContaining({
        body: JSON.stringify(input),
        method: "POST",
      }),
    );
  });

  it("treats unavailable turnout and pre-close results as valid empty states", async () => {
    const fetcher = vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/turnout")) {
        return new Response(null, { status: 404 });
      }
      if (url.pathname.endsWith("/results")) {
        return new Response(null, { status: 409 });
      }
      if (url.pathname.endsWith("/candidates")) {
        return jsonResponse({
          items: [],
          page: 1,
          pageSize: 100,
          totalItems: 0,
          totalPages: 1,
        });
      }
      if (url.pathname.endsWith("/sub-votes/detail-1")) {
        return jsonResponse({
          description: "대표 선출",
          id: "detail-1",
          sortOrder: 0,
          status: "OPEN",
          title: "대표자 선출",
          type: "CANDIDATE",
          voteId: "vote-1",
        });
      }
      return jsonResponse({
        defaultPolicy: {
          participationUnit: "INDIVIDUAL",
          privacyMode: "SECRET",
          resultStorageMode: "DATABASE",
          voteWeightMode: "EQUAL",
        },
      });
    });
    const client = createVoteOperationsApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });

    await expect(
      client.fetchSubVoteOperations("vote-1", "detail-1"),
    ).resolves.toEqual(
      expect.objectContaining({ result: null, turnout: null }),
    );
  });

  it("does not invent unsupported commission and field-session list endpoints", async () => {
    const fetcher = vi.fn();
    const client = createVoteOperationsApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });

    await expect(client.fetchCommissions()).resolves.toEqual({
      items: [],
      readAvailable: false,
    });
    await expect(client.fetchFieldSessions()).resolves.toEqual({
      items: [],
      readAvailable: false,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
