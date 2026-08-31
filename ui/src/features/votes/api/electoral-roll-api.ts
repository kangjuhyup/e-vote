import {
  isApiMockMode,
  type ApiMode,
} from "@/shared/config/api-mode";

import type {
  AddElectoralRollMemberInput,
  AddElectoralRollMembersInput,
  AddElectoralRollMembersResult,
  CreateElectoralRollInput,
  CreateElectoralRollResult,
  ElectoralRollPageInput,
  ElectoralRollPageRecord,
  ElectoralRollRecord,
  ManageElectoralRollMemberResult,
  RemoveElectoralRollMemberInput,
  RemoveElectoralRollMemberResult,
  UpdateElectoralRollMemberInput,
} from "../model/electoral-roll.types";
import {
  electoralRollMockState,
  type MockElectoralRollSnapshot,
} from "./electoral-roll-fixtures";
import { unwrapVoteApiResponse } from "./votes-api";

type ApiFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface CreateElectoralRollApiClientOptions {
  baseUrl?: string;
  fetcher?: ApiFetcher;
  mode?: ApiMode;
  now?: () => string;
}

const mockState = electoralRollMockState;
let mockSequence = 100;

function nextMockId(prefix: string) {
  mockSequence += 1;
  return `${prefix}-${mockSequence}`;
}

function resolveBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_VOTE_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    ""
  ).replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function encode(value: string) {
  return encodeURIComponent(value);
}

async function request<T>(
  fetcher: ApiFetcher,
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (baseUrl.length === 0) {
    throw new Error("NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode");
  }

  const response = await fetcher(buildUrl(baseUrl, path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Vote API request failed: ${response.status}`);
  }

  return unwrapVoteApiResponse<T>(await response.json());
}

async function requestOptional<T>(
  fetcher: ApiFetcher,
  baseUrl: string,
  path: string,
): Promise<T | null> {
  if (baseUrl.length === 0) {
    throw new Error("NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode");
  }

  const response = await fetcher(buildUrl(baseUrl, path), {
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Vote API request failed: ${response.status}`);
  }

  return unwrapVoteApiResponse<T>(await response.json());
}

function requireMockRoll(electoralRollId: string) {
  const roll = mockState.rolls.find((item) => item.id === electoralRollId);
  if (!roll) {
    throw new Error("선거인명부를 찾을 수 없습니다.");
  }
  return roll;
}

export function findMockElectoralRoll(electoralRollId: string) {
  return mockState.rolls.find((item) => item.id === electoralRollId) ?? null;
}

export function createElectoralRollApiClient(
  options: CreateElectoralRollApiClientOptions = {},
) {
  const mode = options.mode ?? (isApiMockMode() ? "mock" : "live");
  const baseUrl = (options.baseUrl ?? resolveBaseUrl()).replace(/\/+$/, "");
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date().toISOString());

  function snapshotCurrentMockRevision(roll: ElectoralRollRecord) {
    const existing = mockState.snapshots.find(
      (item) =>
        item.electoralRollId === roll.id &&
        item.sourceRevision === roll.revision,
    );
    if (existing) return;

    const snapshot: MockElectoralRollSnapshot = {
      id: nextMockId("electoral-roll-snapshot"),
      electoralRollId: roll.id,
      sourceRevision: roll.revision,
      memberCount: roll.members.length,
      contentHash: `mock-hash-${roll.id}-${roll.revision}`,
      createdAt: now(),
      members: roll.members.map(({ groupKey, identifier, voteWeight }) => ({
        groupKey,
        identifier,
        voteWeight,
      })),
    };
    mockState.snapshots.push(snapshot);
  }

  async function fetchElectoralRoll(
    electoralRollId: string,
  ): Promise<ElectoralRollRecord | null> {
    if (mode === "mock") {
      return (
        mockState.rolls.find((item) => item.id === electoralRollId) ?? null
      );
    }

    return requestOptional<ElectoralRollRecord>(
      fetcher,
      baseUrl,
      `/electoral-rolls/${encode(electoralRollId)}`,
    );
  }

  async function fetchElectoralRollPage(
    input: ElectoralRollPageInput = {},
  ): Promise<ElectoralRollPageRecord> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));

    if (mode === "mock") {
      const normalizedQuery = input.query?.trim().toLocaleLowerCase() ?? "";
      const matchingRolls = mockState.rolls
        .filter(
          (roll) =>
            (!input.commissionId || roll.commissionId === input.commissionId) &&
            (normalizedQuery.length === 0 ||
              roll.name.toLocaleLowerCase().includes(normalizedQuery)),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const firstItemIndex = (page - 1) * pageSize;

      return {
        items: matchingRolls
          .slice(firstItemIndex, firstItemIndex + pageSize)
          .map((roll) => ({
            id: roll.id,
            commissionId: roll.commissionId,
            name: roll.name,
            revision: roll.revision,
            memberCount: roll.members.length,
            updatedAt: roll.updatedAt,
          })),
        page,
        pageSize,
        totalItems: matchingRolls.length,
        totalPages: Math.max(1, Math.ceil(matchingRolls.length / pageSize)),
      };
    }

    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (input.commissionId) {
      searchParams.set("commissionId", input.commissionId);
    }
    if (input.query?.trim()) {
      searchParams.set("q", input.query.trim());
    }

    return request<ElectoralRollPageRecord>(
      fetcher,
      baseUrl,
      `/electoral-rolls?${searchParams.toString()}`,
    );
  }

  async function createElectoralRoll(
    input: CreateElectoralRollInput,
  ): Promise<CreateElectoralRollResult> {
    if (mode === "mock") {
      const timestamp = now();
      const roll: ElectoralRollRecord = {
        ...input,
        id: nextMockId("electoral-roll"),
        revision: 1,
        members: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      mockState.rolls.push(roll);
      return {
        id: roll.id,
        commissionId: roll.commissionId,
        name: roll.name,
        revision: roll.revision,
      };
    }

    return request<CreateElectoralRollResult>(
      fetcher,
      baseUrl,
      "/electoral-rolls",
      { method: "POST", body: JSON.stringify(input) },
    );
  }

  async function addMember(
    input: AddElectoralRollMemberInput,
  ): Promise<AddElectoralRollMembersResult> {
    const { electoralRollId, groupKey, identifier, voteWeight = 1 } = input;
    return addMembers({
      electoralRollId,
      members: [
        {
          groupKey,
          identifier,
          rowNumber: 0,
          voteWeight,
        },
      ],
    });
  }

  async function addMembers(
    input: AddElectoralRollMembersInput,
  ): Promise<AddElectoralRollMembersResult> {
    const membersBody = input.members.map(
      ({ groupKey, identifier, voteWeight }) => ({
        groupKey,
        identifier,
        voteWeight,
      }),
    );
    if (mode === "mock") {
      const roll = requireMockRoll(input.electoralRollId);
      const timestamp = now();
      roll.members.push(
        ...membersBody.map((member) => ({
          ...member,
          id: nextMockId("electoral-roll-member"),
          electoralRollId: input.electoralRollId,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
      );
      roll.revision += 1;
      roll.updatedAt = timestamp;
      snapshotCurrentMockRevision(roll);
      return {
        addedMemberCount: membersBody.length,
        electoralRollId: input.electoralRollId,
        revision: roll.revision,
      };
    }

    return request<AddElectoralRollMembersResult>(
      fetcher,
      baseUrl,
      `/electoral-rolls/${encode(input.electoralRollId)}/members`,
      { method: "PUT", body: JSON.stringify({ members: membersBody }) },
    );
  }

  async function updateMember(
    input: UpdateElectoralRollMemberInput,
  ): Promise<ManageElectoralRollMemberResult> {
    const { electoralRollId, memberId, ...body } = input;
    if (mode === "mock") {
      const roll = requireMockRoll(electoralRollId);
      const member = roll.members.find((item) => item.id === memberId);
      if (!member) {
        throw new Error("선거인명부 구성원을 찾을 수 없습니다.");
      }
      Object.assign(member, body, { updatedAt: now() });
      roll.revision += 1;
      roll.updatedAt = member.updatedAt;
      snapshotCurrentMockRevision(roll);
      return {
        id: member.id,
        electoralRollId,
        identifier: member.identifier,
        groupKey: member.groupKey,
        voteWeight: member.voteWeight,
        revision: roll.revision,
      };
    }

    return request<ManageElectoralRollMemberResult>(
      fetcher,
      baseUrl,
      `/electoral-rolls/${encode(electoralRollId)}/members/${encode(memberId)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  }

  async function removeMember(
    input: RemoveElectoralRollMemberInput,
  ): Promise<RemoveElectoralRollMemberResult> {
    const { electoralRollId, memberId } = input;
    if (mode === "mock") {
      const roll = requireMockRoll(electoralRollId);
      const memberIndex = roll.members.findIndex((item) => item.id === memberId);
      if (memberIndex < 0) {
        throw new Error("선거인명부 구성원을 찾을 수 없습니다.");
      }
      roll.members.splice(memberIndex, 1);
      roll.revision += 1;
      roll.updatedAt = now();
      snapshotCurrentMockRevision(roll);
      return { electoralRollId, memberId, revision: roll.revision };
    }

    return request<RemoveElectoralRollMemberResult>(
      fetcher,
      baseUrl,
      `/electoral-rolls/${encode(electoralRollId)}/members/${encode(memberId)}`,
      { method: "DELETE" },
    );
  }

  return {
    addMember,
    addMembers,
    createElectoralRoll,
    fetchElectoralRoll,
    fetchElectoralRollPage,
    mode,
    removeMember,
    updateMember,
  };
}

export const electoralRollApi = createElectoralRollApiClient();
