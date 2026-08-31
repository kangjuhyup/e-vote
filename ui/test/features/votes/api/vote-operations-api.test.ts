import { describe, expect, it, vi } from "vitest";

import { createVoteOperationsApiClient } from "@/features/votes/api/vote-operations-api";
import { electoralRollMockState } from "@/features/votes/api/electoral-roll-fixtures";

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
      }),
    );
    await expect(client.fetchFieldSessions("active-general")).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ voteId: "active-general" }),
        ]),
      }),
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends the existing electoral roll while omitting the optional commission", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
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
      defaultPolicy: {
        participationUnit: "INDIVIDUAL" as const,
        privacyMode: "SECRET" as const,
        resultStorageMode: "DATABASE" as const,
        voteWeightMode: "EQUAL" as const,
      },
      identityVerificationPolicy: { required: false },
      electoralRollId: "electoral-roll-1",
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

  it("connects the latest existing roll snapshot in mock mode without creating one", async () => {
    const client = createVoteOperationsApiClient({ mode: "mock" });
    const snapshotCount = electoralRollMockState.snapshots.length;

    const result = await client.createVote({
      defaultPolicy: {
        participationUnit: "INDIVIDUAL",
        privacyMode: "SECRET",
        resultStorageMode: "DATABASE",
        voteWeightMode: "EQUAL",
      },
      electoralRollId: "electoral-roll-1",
      identityVerificationPolicy: { required: false },
      title: "기존 명부 연결 투표",
      votingChannels: ["ONLINE"],
    });

    expect(result).toMatchObject({
      electoralRollId: "electoral-roll-1",
      electoralRollSnapshotId: "electoral-roll-snapshot-1",
    });
    expect(electoralRollMockState.snapshots).toHaveLength(snapshotCount);
  });

  it("updates draft vote settings without changing its assigned commission", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ id: "vote-1", status: "DRAFT" }),
    );
    const client = createVoteOperationsApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });
    const input = {
      voteId: "vote-1",
      defaultPolicy: {
        participationUnit: "INDIVIDUAL" as const,
        privacyMode: "SECRET" as const,
        resultStorageMode: "DATABASE" as const,
        voteWeightMode: "EQUAL" as const,
      },
      identityVerificationPolicy: { required: false },
      title: "수정한 투표",
      votingChannels: ["ONLINE" as const],
    };

    await expect(client.updateVote(input)).resolves.toEqual(
      expect.objectContaining({ id: "vote-1" }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/votes/vote-1",
      expect.objectContaining({
        body: JSON.stringify({
          defaultPolicy: input.defaultPolicy,
          identityVerificationPolicy: input.identityVerificationPolicy,
          title: input.title,
          votingChannels: input.votingChannels,
        }),
        method: "PATCH",
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

  it("loads a commission page and hydrates members from the detail endpoint", async () => {
    const fetcher = vi.fn(async (input: string) => {
      if (input.endsWith("/election-commissions/commission-1")) {
        return jsonResponse({
          createdAt: "2026-08-30T00:00:00.000Z",
          id: "commission-1",
          members: [
            {
              commissionId: "commission-1",
              id: "member-1",
              name: "김*",
              registeredAt: "2026-08-30T00:01:00.000Z",
              role: "FIELD_MANAGER",
              status: "ACTIVE",
              updatedAt: "2026-08-30T00:01:00.000Z",
            },
          ],
          name: "중앙 선거관리위원회",
          status: "ACTIVE",
          updatedAt: "2026-08-30T00:00:00.000Z",
        });
      }

      return jsonResponse({
        items: [
          {
            createdAt: "2026-08-30T00:00:00.000Z",
            id: "commission-1",
            name: "중앙 선거관리위원회",
            status: "ACTIVE",
            updatedAt: "2026-08-30T00:00:00.000Z",
          },
        ],
        page: 2,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
      });
    });
    const client = createVoteOperationsApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });

    await expect(client.fetchCommissions(2, 10)).resolves.toEqual({
      items: [
        {
          id: "commission-1",
          members: [
            {
              id: "member-1",
              name: "김*",
              role: "FIELD_MANAGER",
              status: "ACTIVE",
            },
          ],
          name: "중앙 선거관리위원회",
          status: "ACTIVE",
        },
      ],
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://api.example.com/election-commissions?page=2&pageSize=10",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.example.com/election-commissions/commission-1",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("loads field sessions through the vote-scoped page endpoint", async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            address: "서울시 중구",
            channel: "ONSITE",
            commissionId: "commission-1",
            createdAt: "2026-08-30T00:00:00.000Z",
            endsAt: "2026-09-01T09:00:00.000Z",
            id: "session-1",
            locationName: "중앙 회의실",
            managerIds: ["member-1"],
            startsAt: "2026-09-01T00:00:00.000Z",
            status: "SCHEDULED",
            title: "현장 투표",
            updatedAt: "2026-08-30T00:00:00.000Z",
            voteId: "vote /1",
          },
        ],
        page: 2,
        pageSize: 10,
        totalItems: 11,
        totalPages: 2,
      }),
    );
    const client = createVoteOperationsApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });

    await expect(client.fetchFieldSessions("vote /1", 2, 10)).resolves.toEqual({
      items: [
        expect.objectContaining({ id: "session-1", voteId: "vote /1" }),
      ],
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/votes/vote%20%2F1/field-voting-sessions?page=2&pageSize=10",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });
});
