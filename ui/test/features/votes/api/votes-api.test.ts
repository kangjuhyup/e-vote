import { describe, expect, it, vi } from "vitest";

import {
  createVotesApiClient,
  mapVoteDetailResponse,
  mapVoteSummaryResponse,
  resolveVoteApiMode,
  unwrapVoteApiResponse,
} from "@/features/votes/api/votes-api";
import type {
  VoteDetailResponseDto,
  VoteElectorResponseDto,
  VoteSummaryResponseDto,
} from "@/features/votes/api/votes-api";

function voteSummaryDto(
  overrides: Partial<VoteSummaryResponseDto> = {},
): VoteSummaryResponseDto {
  return {
    attachments: [],
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
    ...overrides,
  };
}

function voteDetailDto(
  overrides: Partial<VoteDetailResponseDto> = {},
): VoteDetailResponseDto {
  const { description, voteDetails, ...summaryOverrides } = overrides;

  return {
    ...voteSummaryDto(summaryOverrides),
    description: description ?? "대표 후보를 선출합니다.",
    voteDetails: voteDetails ?? [],
  };
}

function electorDto(
  overrides: Partial<VoteElectorResponseDto> = {},
): VoteElectorResponseDto {
  return {
    id: "elector-1",
    voteId: "vote-1",
    name: "Lee",
    identifier: "member-1",
    groupKey: "운영팀",
    voteWeight: 1,
    status: "ELIGIBLE",
    identityVerified: false,
    createdAt: "2026-08-09T09:00:00.000Z",
    updatedAt: "2026-08-09T10:00:00.000Z",
    ...overrides,
  };
}

function pageDto<T>(items: T[], page = 1, totalPages = 1) {
  return {
    items,
    page,
    pageSize: 100,
    totalItems: items.length,
    totalPages,
  };
}

function jsonResponse(data: unknown) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: "2026-08-13T00:00:00.000Z",
    }),
  );
}

const attachmentDto = {
  createdAt: "2026-09-06T12:00:00.000Z",
  fileId: "file-1",
  id: "attachment-1",
  mimeType: "application/pdf",
  originalName: "공고문.pdf",
  sizeBytes: 1024,
  sortOrder: 0,
  type: "NOTICE" as const,
};

describe("votes api", () => {
  it("calls the browser fetch function without rebinding its receiver", async () => {
    const browserFetch = vi.fn(function (this: unknown) {
      if (this !== undefined && this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      return Promise.resolve(jsonResponse(pageDto([], 1, 0)));
    });
    vi.stubGlobal("fetch", browserFetch);

    try {
      const client = createVotesApiClient({
        baseUrl: "https://api.example.com",
        mode: "live",
      });

      await expect(client.fetchVoteList()).resolves.toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("maps a successful empty vote page to an empty list", async () => {
    const fetcher = vi.fn(async () => jsonResponse(pageDto([], 1, 0)));
    const client = createVotesApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });

    await expect(client.fetchVoteList()).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('/votes?page=1&pageSize=100'),
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it("enables mock mode only for the explicit mock value", () => {
    expect(resolveVoteApiMode("mock")).toBe("mock");
    expect(resolveVoteApiMode("live")).toBe("live");
    expect(resolveVoteApiMode("MOCK")).toBe("live");
    expect(resolveVoteApiMode("")).toBe("live");
  });

  it("does not call the configured API while mock mode is enabled", async () => {
    const fetcher = vi.fn();
    const client = createVotesApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "mock",
    });

    await expect(client.fetchVoteList()).resolves.not.toHaveLength(0);
    await expect(client.fetchVoteDetail("active-general")).resolves.toEqual(
      expect.objectContaining({ id: "active-general" }),
    );
    expect(client.mode).toBe("mock");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("requires an API base URL while live mode is enabled", async () => {
    const fetcher = vi.fn();
    const client = createVotesApiClient({
      baseUrl: "",
      fetcher,
      mode: "live",
    });

    await expect(client.fetchVoteList()).rejects.toThrow(
      "NEXT_PUBLIC_VOTE_API_BASE_URL is required",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

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
      ["DRAFT", "FINALIZED", "OPEN", "CLOSED", "CANCELED"].map((status) =>
        mapVoteSummaryResponse(
          voteSummaryDto({
            id: `vote-${status}`,
            title: status,
            status,
            startedAt: "2026-08-10T09:00:00.000Z",
          }),
          "2026-08-13T00:00:00.000Z",
        ),
      ),
    ).toEqual([
      expect.objectContaining({ status: "draft" }),
      expect.objectContaining({ status: "finalized" }),
      expect.objectContaining({ status: "active" }),
      expect.objectContaining({ status: "completed" }),
      expect.objectContaining({ status: "canceled" }),
    ]);
  });

  it("keeps future draft votes as drafts until payment finalizes them", () => {
    expect(
      mapVoteSummaryResponse(
        voteSummaryDto({
          status: "DRAFT",
          startedAt: "2026-09-01T09:00:00.000Z",
        }),
        "2026-08-13T00:00:00.000Z",
      ),
    ).toEqual(expect.objectContaining({ status: "draft" }));
  });

  it.each(["PENDING_PAYMENT", "PAID", "REFUND_PENDING"] as const)(
    "preserves the active billing order contract for %s",
    (billingOrderStatus) => {
      expect(
        mapVoteSummaryResponse(
          voteSummaryDto({
            activeBillingOrderId: "billing-order-1",
            billingOrderStatus,
          }),
        ),
      ).toEqual(
        expect.objectContaining({
          activeBillingOrderId: "billing-order-1",
          billingOrderStatus,
        }),
      );
    },
  );

  it("keeps terminal or unauthorized billing fields omitted", () => {
    const vote = mapVoteSummaryResponse(voteSummaryDto());

    expect(vote).not.toHaveProperty("activeBillingOrderId");
    expect(vote).not.toHaveProperty("billingOrderStatus");
  });

  it("preserves the attached electoral-roll snapshot id", () => {
    expect(
      mapVoteSummaryResponse(
        voteSummaryDto({
          electoralRollSnapshotId: "electoral-roll-snapshot-1",
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        electoralRollSnapshotId: "electoral-roll-snapshot-1",
      }),
    );
    expect(
      mapVoteDetailResponse(
        voteDetailDto({
          electoralRollSnapshotId: "electoral-roll-snapshot-1",
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        electoralRollSnapshotId: "electoral-roll-snapshot-1",
      }),
    );
  });

  it("maps server vote detail DTO values without leaking DTO casing", () => {
    expect(
      mapVoteDetailResponse(
        {
          id: "vote-1",
          commissionId: "commission-1",
          attachments: [attachmentDto],
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
              attachments: [{ ...attachmentDto, id: "detail-attachment-1" }],
              candidates: [
                {
                  attachments: [
                    {
                      ...attachmentDto,
                      id: "candidate-attachment-1",
                      type: "PLEDGE",
                    },
                  ],
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
      attachments: [expect.objectContaining({ id: "attachment-1" })],
      candidates: [expect.objectContaining({ id: "candidate-1", order: 1 })],
      subVotes: [
        expect.objectContaining({
          attachments: [
            expect.objectContaining({ id: "detail-attachment-1" }),
          ],
          candidates: [
            expect.objectContaining({
              attachments: [
                expect.objectContaining({ id: "candidate-attachment-1" }),
              ],
            }),
          ],
        }),
      ],
      electors: [
        expect.objectContaining({ id: "elector-1", participated: true }),
        expect.objectContaining({ id: "elector-2", participatedAt: null }),
      ],
    });
  });

  it("maps vote summaries without issuing per-vote detail requests", async () => {
    const fetcher = vi.fn(async (input: string) => {
      if (input === "http://localhost:3000/votes?page=1&pageSize=100") {
        return jsonResponse(
          pageDto([
            voteSummaryDto({
              activeBillingOrderId: "billing-order-1",
              billingOrderStatus: "PENDING_PAYMENT",
            }),
          ]),
        );
      }

      throw new Error(`unexpected URL: ${input}`);
    });
    const client = createVotesApiClient({
      baseUrl: "http://localhost:3000/",
      fetcher,
      mode: "live",
    });

    await expect(client.fetchVoteList()).resolves.toEqual([
      expect.objectContaining({
        id: "vote-1",
        status: "active",
        activeBillingOrderId: "billing-order-1",
        billingOrderStatus: "PENDING_PAYMENT",
        startsAt: "2026-08-10T09:00:00.000Z",
        endsAt: "2026-08-20T09:00:00.000Z",
        electorCount: 0,
        participatedCount: 0,
        participationKnown: false,
      }),
    ]);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3000/votes?page=1&pageSize=100",
    ]);
  });

  it("shows the participation counts supplied by the vote list", async () => {
    const client = createVotesApiClient({
      baseUrl: "http://localhost:3000",
      mode: "live",
      fetcher: vi.fn(async () =>
        jsonResponse(
          pageDto([voteSummaryDto({ electorCount: 1, participatedCount: 1 })]),
        ),
      ),
    });

    await expect(client.fetchVoteList()).resolves.toEqual([
      expect.objectContaining({
        electorCount: 1,
        participatedCount: 1,
        participationKnown: true,
      }),
    ]);
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
      mode: "live",
    });

    await expect(client.fetchVoteDetail("vote/1")).resolves.toEqual(
      expect.objectContaining({
        id: "vote/1",
        status: "active",
        electorCount: 1,
        participationKnown: false,
        candidates: [expect.objectContaining({ id: "candidate-1", order: 1 })],
        electors: [
          expect.objectContaining({
            id: "elector-1",
            label: "운영팀",
            participated: false,
            participationKnown: false,
          }),
        ],
      }),
    );
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3000/api/votes/vote%2F1",
      "http://localhost:3000/api/votes/vote%2F1/electors?page=1&pageSize=100",
    ]);
  });

  it("fetches every elector roster page for vote details", async () => {
    const fetcher = vi.fn(async (input: string) => {
      if (input === "http://localhost:3000/api/votes/vote-1") {
        return jsonResponse(voteDetailDto());
      }

      if (
        input ===
        "http://localhost:3000/api/votes/vote-1/electors?page=1&pageSize=100"
      ) {
        return jsonResponse(
          pageDto(
            [electorDto({ id: "elector-1", identifier: "member-1" })],
            1,
            2,
          ),
        );
      }

      if (
        input ===
        "http://localhost:3000/api/votes/vote-1/electors?page=2&pageSize=100"
      ) {
        return jsonResponse(
          pageDto(
            [electorDto({ id: "elector-2", identifier: "member-2" })],
            2,
            2,
          ),
        );
      }

      throw new Error(`unexpected URL: ${input}`);
    });
    const client = createVotesApiClient({
      baseUrl: "http://localhost:3000/api",
      fetcher,
      mode: "live",
    });

    await expect(client.fetchVoteDetail("vote-1")).resolves.toEqual(
      expect.objectContaining({
        electors: [
          expect.objectContaining({ id: "elector-1" }),
          expect.objectContaining({ id: "elector-2" }),
        ],
      }),
    );
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3000/api/votes/vote-1",
      "http://localhost:3000/api/votes/vote-1/electors?page=1&pageSize=100",
      "http://localhost:3000/api/votes/vote-1/electors?page=2&pageSize=100",
    ]);
  });

  it("returns null for a missing vote detail response from the server API", async () => {
    const fetcher = vi.fn(async () => {
      return new Response(null, { status: 404 });
    });
    const client = createVotesApiClient({
      baseUrl: "http://localhost:3000",
      fetcher,
      mode: "live",
    });

    await expect(client.fetchVoteDetail("missing")).resolves.toBeNull();
  });
});
