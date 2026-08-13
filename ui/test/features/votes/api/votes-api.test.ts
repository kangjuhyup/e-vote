import { describe, expect, it, vi } from "vitest";

import {
  createVotesApiClient,
  mapVoteDetailResponse,
  mapVoteSummaryResponse,
  unwrapVoteApiResponse,
} from "@/features/votes/api/votes-api";

describe("votes api", () => {
  it("unwraps the server response envelope from the presentation interceptor", () => {
    expect(
      unwrapVoteApiResponse({
        success: true,
        data: { id: "vote-1" },
        timestamp: "2026-08-13T00:00:00.000Z",
        requestId: "request-1",
      }),
    ).toEqual({ id: "vote-1" });
  });

  it("maps server vote status DTO values into UI vote statuses", () => {
    expect(
      ["DRAFT", "OPEN", "CLOSED", "CANCELED"].map((status) =>
        mapVoteSummaryResponse({
          id: `vote-${status}`,
          title: status,
          status,
          startsAt: "2026-08-10T09:00:00.000Z",
          endsAt: "2026-08-20T09:00:00.000Z",
          electorCount: 10,
          participatedCount: 4,
        }),
      ),
    ).toEqual([
      expect.objectContaining({ status: "draft" }),
      expect.objectContaining({ status: "active" }),
      expect.objectContaining({ status: "completed" }),
      expect.objectContaining({ status: "canceled" }),
    ]);
  });

  it("maps server vote detail DTO values without leaking DTO casing", () => {
    expect(
      mapVoteDetailResponse({
        id: "vote-1",
        title: "Board election",
        description: "대표 후보를 선출합니다.",
        status: "OPEN",
        startsAt: "2026-08-10T09:00:00.000Z",
        endsAt: "2026-08-20T09:00:00.000Z",
        electorCount: 2,
        participatedCount: 1,
        candidates: [
          {
            id: "candidate-1",
            name: "Kim",
            description: "운영 개선",
            order: 1,
          },
        ],
        electors: [
          {
            id: "elector-1",
            name: "Lee",
            label: "운영팀",
            participated: true,
            participatedAt: "2026-08-11T02:00:00.000Z",
          },
          {
            id: "elector-2",
            name: "Park",
            label: "재무팀",
            participated: false,
            participatedAt: null,
          },
        ],
      }),
    ).toMatchObject({
      id: "vote-1",
      status: "active",
      candidates: [expect.objectContaining({ id: "candidate-1", order: 1 })],
      electors: [
        expect.objectContaining({ id: "elector-1", participated: true }),
        expect.objectContaining({ id: "elector-2", participatedAt: null }),
      ],
    });
  });

  it("fetches vote summaries from the configured server API base URL", async () => {
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              id: "vote-1",
              title: "Board election",
              status: "OPEN",
              startsAt: "2026-08-10T09:00:00.000Z",
              endsAt: "2026-08-20T09:00:00.000Z",
              electorCount: 10,
              participatedCount: 4,
            },
          ],
          timestamp: "2026-08-13T00:00:00.000Z",
          requestId: "request-1",
        }),
      );
    });
    const client = createVotesApiClient({
      baseUrl: "http://localhost:3000/",
      fetcher,
    });

    await expect(client.fetchVoteList()).resolves.toEqual([
      expect.objectContaining({ id: "vote-1", status: "active" }),
    ]);
    expect(fetcher).toHaveBeenCalledWith("http://localhost:3000/votes", {
      headers: { Accept: "application/json" },
    });
  });

  it("fetches vote detail with an encoded vote id from the configured server API", async () => {
    const fetcher = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "vote/1",
            title: "Board election",
            description: "대표 후보를 선출합니다.",
            status: "OPEN",
            startsAt: "2026-08-10T09:00:00.000Z",
            endsAt: "2026-08-20T09:00:00.000Z",
            electorCount: 0,
            participatedCount: 0,
            candidates: [],
            electors: [],
          },
          timestamp: "2026-08-13T00:00:00.000Z",
        }),
      );
    });
    const client = createVotesApiClient({
      baseUrl: "http://localhost:3000/api",
      fetcher,
    });

    await expect(client.fetchVoteDetail("vote/1")).resolves.toEqual(
      expect.objectContaining({ id: "vote/1", status: "active" }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:3000/api/votes/vote%2F1",
      {
        headers: { Accept: "application/json" },
      },
    );
  });

  it("returns null for a missing vote detail response from the server API", async () => {
    const fetcher = vi.fn(async () => {
      return new Response(null, { status: 404 });
    });
    const client = createVotesApiClient({
      baseUrl: "http://localhost:3000",
      fetcher,
    });

    await expect(client.fetchVoteDetail("missing")).resolves.toBeNull();
  });
});
