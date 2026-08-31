import { describe, expect, it, vi } from "vitest";

import { createElectoralRollApiClient } from "@/features/votes/api/electoral-roll-api";
import {
  electoralRollMockState,
  findLatestMockElectoralRollSnapshot,
} from "@/features/votes/api/electoral-roll-fixtures";

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

const rollDto = {
  id: "roll /1",
  commissionId: "commission-1",
  name: "2026 선거인명부",
  revision: 2,
  members: [
    {
      id: "member-1",
      electoralRollId: "roll /1",
      identifier: "employee-1",
      groupKey: "operations",
      voteWeight: 1,
      createdAt: "2026-08-30T00:00:00.000Z",
      updatedAt: "2026-08-30T00:01:00.000Z",
    },
  ],
  createdAt: "2026-08-30T00:00:00.000Z",
  updatedAt: "2026-08-30T00:01:00.000Z",
};

describe("electoral roll api", () => {
  it("uses the electoral-roll source routes in live mode", async () => {
    const fetcher = vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input);

      if (init?.method === "POST" && url.pathname === "/electoral-rolls") {
        return jsonResponse({
          id: "roll-2",
          commissionId: "commission-1",
          name: "신규 명부",
          revision: 1,
        }, 201);
      }
      if (init?.method === "PUT" && url.pathname.endsWith("/members")) {
        const body = JSON.parse(String(init.body)) as { members: unknown[] };
        return jsonResponse({
          electoralRollId: "roll /1",
          revision: 3,
          addedMemberCount: body.members.length,
        }, 201);
      }
      if (init?.method === "PATCH") {
        return jsonResponse({
          id: "member-1",
          electoralRollId: "roll /1",
          identifier: "employee-1-updated",
          groupKey: "audit",
          voteWeight: 3,
          revision: 4,
        });
      }
      if (init?.method === "DELETE") {
        return jsonResponse({
          electoralRollId: "roll /1",
          memberId: "member-1",
          revision: 5,
        });
      }
      if (url.searchParams.has("page")) {
        return jsonResponse({
          items: [
            {
              id: rollDto.id,
              commissionId: rollDto.commissionId,
              name: rollDto.name,
              revision: rollDto.revision,
              memberCount: rollDto.members.length,
              updatedAt: rollDto.updatedAt,
            },
          ],
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        });
      }
      return jsonResponse(rollDto);
    });
    const client = createElectoralRollApiClient({
      baseUrl: "https://api.example.com/",
      fetcher,
      mode: "live",
    });

    await expect(client.fetchElectoralRoll("roll /1")).resolves.toEqual(
      rollDto,
    );
    await expect(
      client.fetchElectoralRollPage({ page: 1, pageSize: 20, query: "2026" }),
    ).resolves.toEqual(expect.objectContaining({ totalItems: 1 }));
    await expect(
      client.createElectoralRoll({
        commissionId: "commission-1",
        name: "신규 명부",
      }),
    ).resolves.toEqual(expect.objectContaining({ id: "roll-2", revision: 1 }));
    await client.addMember({
      electoralRollId: "roll /1",
      identifier: "employee-2",
      voteWeight: 2,
    });
    await client.updateMember({
      electoralRollId: "roll /1",
      memberId: "member-1",
      identifier: "employee-1-updated",
      groupKey: "audit",
      voteWeight: 3,
    });
    await client.removeMember({
      electoralRollId: "roll /1",
      memberId: "member-1",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/electoral-rolls/roll%20%2F1",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/electoral-rolls?page=1&pageSize=20&q=2026",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/electoral-rolls",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          commissionId: "commission-1",
          name: "신규 명부",
        }),
      }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/electoral-rolls/roll%20%2F1/members",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          members: [
            {
              identifier: "employee-2",
              voteWeight: 2,
            },
          ],
        }),
      }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/electoral-rolls/roll%20%2F1/members/member-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/electoral-rolls/roll%20%2F1/members/member-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(fetcher).toHaveBeenCalledTimes(6);
  });

  it("returns paged roll metadata in mock mode", async () => {
    const client = createElectoralRollApiClient({ mode: "mock" });

    await expect(
      client.fetchElectoralRollPage({ page: 1, pageSize: 20, query: "상반기" }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: "electoral-roll-1",
            memberCount: expect.any(Number),
          }),
        ],
        page: 1,
      }),
    );
  });

  it("maps a missing roll to null", async () => {
    const client = createElectoralRollApiClient({
      baseUrl: "https://api.example.com",
      fetcher: vi.fn(async () => new Response(null, { status: 404 })),
      mode: "live",
    });

    await expect(client.fetchElectoralRoll("missing")).resolves.toBeNull();
  });

  it("adds imported members with one master-server bulk request", async () => {
    const fetcher = vi.fn(async (_input: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { members: unknown[] };
      return jsonResponse({
        electoralRollId: "roll-1",
        revision: 2,
        addedMemberCount: body.members.length,
      }, 201);
    });
    const client = createElectoralRollApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "live",
    });
    const result = await client.addMembers({
      electoralRollId: "roll-1",
      members: Array.from({ length: 8 }, (_, index) => ({
        identifier: `employee-${index + 1}`,
        rowNumber: index + 2,
        voteWeight: 1,
      })),
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/electoral-rolls/roll-1/members",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          members: Array.from({ length: 8 }, (_, index) => ({
            groupKey: undefined,
            identifier: `employee-${index + 1}`,
            voteWeight: 1,
          })),
        }),
      }),
    );
    expect(result).toEqual({
      addedMemberCount: 8,
      electoralRollId: "roll-1",
      revision: 2,
    });
  });

  it("creates immutable snapshots automatically for mock roll revisions", async () => {
    const fetcher = vi.fn();
    const client = createElectoralRollApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      mode: "mock",
    });
    const created = await client.createElectoralRoll({
      commissionId: "commission-1",
      name: "Mock 명부",
    });
    await client.addMember({
      electoralRollId: created.id,
      identifier: "mock-member",
      groupKey: "mock-group",
      voteWeight: 2,
    });
    const member = (await client.fetchElectoralRoll(created.id))?.members[0];
    expect(member).toBeDefined();
    const updated = await client.updateMember({
      electoralRollId: created.id,
      memberId: member!.id,
      identifier: "mock-member-updated",
      groupKey: "changed-group",
      voteWeight: 4,
    });
    const revisionTwoSnapshot = findLatestMockElectoralRollSnapshot(created.id);
    expect(revisionTwoSnapshot).toMatchObject({
      electoralRollId: created.id,
      memberCount: 1,
      sourceRevision: updated.revision,
      members: [
        expect.objectContaining({
          identifier: "mock-member-updated",
          groupKey: "changed-group",
          voteWeight: 4,
        }),
      ],
    });
    await client.updateMember({
      electoralRollId: created.id,
      memberId: member!.id,
      identifier: "changed-after-snapshot",
      groupKey: "newer-source-group",
      voteWeight: 8,
    });
    const latestSnapshot = findLatestMockElectoralRollSnapshot(created.id);
    expect(latestSnapshot).toMatchObject({
      electoralRollId: created.id,
      sourceRevision: updated.revision + 1,
      members: [
        expect.objectContaining({
          identifier: "changed-after-snapshot",
          groupKey: "newer-source-group",
          voteWeight: 8,
        }),
      ],
    });
    expect(
      electoralRollMockState.snapshots.filter(
        (snapshot) => snapshot.electoralRollId === created.id,
      ),
    ).toHaveLength(3);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
