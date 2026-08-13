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
          commissionId: "commission-1",
          title: status,
          votingChannels: ["ONLINE"],
          defaultPolicy: {
            privacyMode: "SECRET",
            participationUnit: "INDIVIDUAL",
            resultStorageMode: "DATABASE",
            voteWeightMode: "EQUAL",
          },
          identityVerificationPolicy: {
            required: false,
          },
          status,
          startedAt: "2026-08-10T09:00:00.000Z",
          endedAt: "2026-08-20T09:00:00.000Z",
          createdAt: "2026-08-09T09:00:00.000Z",
          updatedAt: "2026-08-09T10:00:00.000Z",
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
      mapVoteDetailResponse(
        {
          id: "vote-1",
          commissionId: "commission-1",
          title: "Board election",
          description: "대표 후보를 선출합니다.",
          votingChannels: ["ONLINE"],
          defaultPolicy: {
            privacyMode: "SECRET",
            participationUnit: "INDIVIDUAL",
            resultStorageMode: "DATABASE",
            voteWeightMode: "EQUAL",
          },
          identityVerificationPolicy: {
            required: false,
          },
          status: "OPEN",
          startedAt: "2026-08-10T09:00:00.000Z",
          endedAt: "2026-08-20T09:00:00.000Z",
          createdAt: "2026-08-09T09:00:00.000Z",
          updatedAt: "2026-08-09T10:00:00.000Z",
          voteDetails: [
            {
              id: "vote-detail-1",
              voteId: "vote-1",
              title: "President",
              description: "대표 후보",
              type: "CANDIDATE",
              sortOrder: 0,
              status: "OPEN",
              candidates: [
                {
                  id: "candidate-1",
                  voteDetailId: "vote-detail-1",
                  candidateNo: 1,
                  name: "Kim",
                  description: "운영 개선",
                  status: "ACTIVE",
                  createdAt: "2026-08-09T09:00:00.000Z",
                  updatedAt: "2026-08-09T10:00:00.000Z",
                },
              ],
              createdAt: "2026-08-09T09:00:00.000Z",
              updatedAt: "2026-08-09T10:00:00.000Z",
            },
          ],
        },
        [
          {
            id: "elector-1",
            voteId: "vote-1",
            name: "Lee",
            identifier: "member-1",
            groupKey: "운영팀",
            voteWeight: 1,
            status: "ELIGIBLE",
            identityVerified: true,
            participated: true,
            participatedAt: "2026-08-11T02:00:00.000Z",
            createdAt: "2026-08-09T09:00:00.000Z",
            updatedAt: "2026-08-09T10:00:00.000Z",
          },
          {
            id: "elector-2",
            voteId: "vote-1",
            name: "Park",
            identifier: "member-2",
            groupKey: "재무팀",
            voteWeight: 1,
            status: "ELIGIBLE",
            identityVerified: false,
            createdAt: "2026-08-09T09:00:00.000Z",
            updatedAt: "2026-08-09T10:00:00.000Z",
          },
        ],
      ),
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
          data: {
            items: [
              {
                id: "vote-1",
                commissionId: "commission-1",
                title: "Board election",
                votingChannels: ["ONLINE"],
                defaultPolicy: {
                  privacyMode: "SECRET",
                  participationUnit: "INDIVIDUAL",
                  resultStorageMode: "DATABASE",
                  voteWeightMode: "EQUAL",
                },
                identityVerificationPolicy: {
                  required: false,
                },
                status: "OPEN",
                startedAt: "2026-08-10T09:00:00.000Z",
                endedAt: "2026-08-20T09:00:00.000Z",
                createdAt: "2026-08-09T09:00:00.000Z",
                updatedAt: "2026-08-09T10:00:00.000Z",
              },
            ],
            page: 1,
            pageSize: 100,
            totalItems: 1,
            totalPages: 1,
          },
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
      expect.objectContaining({
        id: "vote-1",
        status: "active",
        startsAt: "2026-08-10T09:00:00.000Z",
        endsAt: "2026-08-20T09:00:00.000Z",
        electorCount: 0,
        participatedCount: 0,
      }),
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:3000/votes?page=1&pageSize=100",
      {
        headers: { Accept: "application/json" },
      },
    );
  });

  it("fetches vote detail and elector roster from the configured server API", async () => {
    const fetcher = vi.fn(async (_input: string, _init?: RequestInit) => {
      void _input;
      void _init;

      if (fetcher.mock.calls.length === 1) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              id: "vote/1",
              commissionId: "commission-1",
              title: "Board election",
              description: "대표 후보를 선출합니다.",
              votingChannels: ["ONLINE"],
              defaultPolicy: {
                privacyMode: "SECRET",
                participationUnit: "INDIVIDUAL",
                resultStorageMode: "DATABASE",
                voteWeightMode: "EQUAL",
              },
              identityVerificationPolicy: {
                required: false,
              },
              status: "OPEN",
              startedAt: "2026-08-10T09:00:00.000Z",
              endedAt: "2026-08-20T09:00:00.000Z",
              createdAt: "2026-08-09T09:00:00.000Z",
              updatedAt: "2026-08-09T10:00:00.000Z",
              voteDetails: [
                {
                  id: "vote-detail-1",
                  voteId: "vote/1",
                  title: "President",
                  description: "",
                  type: "CANDIDATE",
                  sortOrder: 0,
                  status: "OPEN",
                  candidates: [
                    {
                      id: "candidate-1",
                      voteDetailId: "vote-detail-1",
                      candidateNo: 1,
                      name: "Kim",
                      description: "운영 개선",
                      status: "ACTIVE",
                      createdAt: "2026-08-09T09:00:00.000Z",
                      updatedAt: "2026-08-09T10:00:00.000Z",
                    },
                  ],
                  createdAt: "2026-08-09T09:00:00.000Z",
                  updatedAt: "2026-08-09T10:00:00.000Z",
                },
              ],
            },
            timestamp: "2026-08-13T00:00:00.000Z",
          }),
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: "elector-1",
                voteId: "vote/1",
                name: "Lee",
                identifier: "member-1",
                groupKey: "운영팀",
                voteWeight: 1,
                status: "ELIGIBLE",
                identityVerified: false,
                createdAt: "2026-08-09T09:00:00.000Z",
                updatedAt: "2026-08-09T10:00:00.000Z",
              },
            ],
            page: 1,
            pageSize: 100,
            totalItems: 1,
            totalPages: 1,
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
      expect.objectContaining({
        id: "vote/1",
        status: "active",
        electorCount: 1,
        candidates: [expect.objectContaining({ id: "candidate-1", order: 1 })],
        electors: [
          expect.objectContaining({
            id: "elector-1",
            label: "운영팀",
            participated: false,
          }),
        ],
      }),
    );
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3000/api/votes/vote%2F1",
      "http://localhost:3000/api/votes/vote%2F1/electors?page=1&pageSize=100",
    ]);
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
