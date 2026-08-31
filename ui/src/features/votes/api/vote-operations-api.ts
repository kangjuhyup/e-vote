import { isApiMockMode } from "@/shared/config/api-mode";

import type {
  CommissionRecord,
  CreateCandidateInput,
  CreateElectorInput,
  CreateFieldSessionInput,
  CreateSubVoteInput,
  CreateVoteInput,
  CreateVoteResult,
  ElectorRecord,
  FieldSessionRecord,
  FieldSessionStatus,
  OperationCandidate,
  PageResult,
  SubVoteOperations,
  VotePolicyRecord,
  VoteResultRecord,
  VoteTurnoutRecord,
  UpdateVoteInput,
} from "../model/vote-operations.types";
import { findLatestMockElectoralRollSnapshot } from "./electoral-roll-fixtures";
import { createVoteOperationsFixtures } from "./vote-operations-fixtures";
import { voteFixtureDetails } from "./votes-fixtures";
import { unwrapVoteApiResponse } from "./votes-api";

type ApiFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface CreateVoteOperationsApiClientOptions {
  baseUrl?: string;
  fetcher?: ApiFetcher;
  mode?: "live" | "mock";
}

interface PageDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface SubVoteDto {
  description: string;
  id: string;
  overrides?: Partial<VotePolicyRecord>;
  sortOrder: number;
  status: SubVoteOperations["status"];
  title: string;
  type: SubVoteOperations["type"];
  voteId: string;
}

interface ParentVoteDto {
  commissionId: string;
  defaultPolicy: VotePolicyRecord;
}

interface CandidateDto {
  candidateNo: number;
  description: string;
  id: string;
  name: string;
  status: OperationCandidate["status"];
}

interface ElectorDto extends ElectorRecord {
  createdAt: string;
  updatedAt: string;
}

interface CommissionSummaryDto {
  createdAt: string;
  id: string;
  name: string;
  status: CommissionRecord["status"];
  updatedAt: string;
}

type CommissionMemberDto = CommissionRecord["members"][number] & {
  commissionId: string;
  registeredAt: string;
  updatedAt: string;
};

interface CommissionDetailDto extends CommissionSummaryDto {
  members: CommissionMemberDto[];
}

interface FieldSessionDto extends FieldSessionRecord {
  createdAt: string;
  updatedAt: string;
}

interface CreateElectorResponseDto {
  birthDate?: string;
  id: string;
  name: string;
  phoneNumber?: string;
  status: ElectorRecord["status"];
  voteId: string;
}

interface CreateEntityResponse {
  id: string;
  status: string;
  voteId?: string;
  voteDetailId?: string;
  commissionId?: string;
}

const mockState = createVoteOperationsFixtures();
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

function buildUrl(baseUrl: string, path: string, query?: URLSearchParams) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const search = query && query.size > 0 ? `?${query.toString()}` : "";
  return `${baseUrl}${normalizedPath}${search}`;
}

async function request<T>(
  fetcher: ApiFetcher,
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  query?: URLSearchParams,
): Promise<T> {
  if (baseUrl.length === 0) {
    throw new Error("NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode");
  }

  const response = await fetcher(buildUrl(baseUrl, path, query), {
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

  if (response.status === 404 || response.status === 409) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Vote API request failed: ${response.status}`);
  }

  return unwrapVoteApiResponse<T>(await response.json());
}

function encode(value: string) {
  return encodeURIComponent(value);
}

function toCandidate(dto: CandidateDto): OperationCandidate {
  return {
    id: dto.id,
    candidateNo: dto.candidateNo,
    name: dto.name,
    description: dto.description,
    status: dto.status,
  };
}

function toCommission(dto: CommissionDetailDto): CommissionRecord {
  return {
    id: dto.id,
    members: dto.members.map(({ id, name, role, status }) => ({
      id,
      name,
      role,
      status,
    })),
    name: dto.name,
    status: dto.status,
  };
}

function paginate<T>(items: T[], page: number, pageSize: number): PageResult<T> {
  const normalizedPage = Math.max(1, Math.trunc(page));
  const normalizedPageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));
  const offset = (normalizedPage - 1) * normalizedPageSize;

  return {
    items: items.slice(offset, offset + normalizedPageSize),
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / normalizedPageSize),
  };
}

export function createVoteOperationsApiClient(
  options: CreateVoteOperationsApiClientOptions = {},
) {
  const mode = options.mode ?? (isApiMockMode() ? "mock" : "live");
  const baseUrl = (options.baseUrl ?? resolveBaseUrl()).replace(/\/+$/, "");
  const fetcher = options.fetcher ?? fetch;

  async function fetchSubVoteOperations(
    voteId: string,
    voteDetailId: string,
  ): Promise<SubVoteOperations | null> {
    if (mode === "mock") {
      return (
        mockState.subVotes.find(
          (item) => item.voteId === voteId && item.id === voteDetailId,
        ) ?? null
      );
    }

    const votePath = `/votes/${encode(voteId)}`;
    const detailPath = `${votePath}/sub-votes/${encode(voteDetailId)}`;
    const [parentVote, detail, candidatePage, turnout, result] =
      await Promise.all([
        request<ParentVoteDto>(fetcher, baseUrl, votePath),
        requestOptional<SubVoteDto>(fetcher, baseUrl, detailPath),
        request<PageDto<CandidateDto>>(
          fetcher,
          baseUrl,
          `${detailPath}/candidates`,
          {},
          new URLSearchParams({ page: "1", pageSize: "100" }),
        ),
        requestOptional<VoteTurnoutRecord>(
          fetcher,
          baseUrl,
          `${detailPath}/turnout`,
        ),
        requestOptional<VoteResultRecord>(
          fetcher,
          baseUrl,
          `${detailPath}/results`,
        ),
      ]);

    if (!detail) {
      return null;
    }

    return {
      ...detail,
      policy: { ...parentVote.defaultPolicy, ...detail.overrides },
      candidates: candidatePage.items.map(toCandidate),
      turnout,
      result,
    };
  }

  async function fetchElectors(
    voteId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PageResult<ElectorRecord>> {
    if (mode === "mock") {
      const items = mockState.electors.filter((item) => item.voteId === voteId);
      const offset = (page - 1) * pageSize;
      return {
        items: items.slice(offset, offset + pageSize),
        page,
        pageSize,
        totalItems: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
      };
    }

    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    return request<PageDto<ElectorDto>>(
      fetcher,
      baseUrl,
      `/votes/${encode(voteId)}/electors`,
      {},
      query,
    );
  }

  async function createVote(input: CreateVoteInput): Promise<CreateVoteResult> {
    if (mode === "mock") {
      const electoralRollSnapshot = findLatestMockElectoralRollSnapshot(
        input.electoralRollId,
      );
      if (!electoralRollSnapshot) {
        throw new Error("선택한 선거인명부의 스냅샷을 찾을 수 없습니다.");
      }
      const id = nextMockId("vote");
      const startsAt = new Date().toISOString();
      const endsAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
      const electors = electoralRollSnapshot.members.map((member) => ({
        id: nextMockId("elector"),
        name: member.identifier,
        label: member.groupKey ?? member.identifier,
        participated: false,
        participatedAt: null,
        participationKnown: true,
      }));
      mockState.electors.push(
        ...electoralRollSnapshot.members.map((member, index) => ({
          id: electors[index].id,
          voteId: id,
          name: member.identifier,
          identifier: member.identifier,
          groupKey: member.groupKey,
          voteWeight: member.voteWeight,
          status: "ELIGIBLE" as const,
          identityVerified: false,
        })),
      );
      voteFixtureDetails.push({
        ...(input.commissionId ? { commissionId: input.commissionId } : {}),
        electoralRollSnapshotId: electoralRollSnapshot.id,
        defaultPolicy: { ...input.defaultPolicy },
        id,
        identityVerificationPolicy: {
          ...input.identityVerificationPolicy,
        },
        title: input.title,
        description: "설정 중인 신규 투표입니다.",
        status: "draft",
        startsAt,
        endsAt,
        electorCount: electors.length,
        participatedCount: 0,
        participationKnown: true,
        candidates: [],
        electors,
        subVotes: [],
        votingChannels: [...input.votingChannels],
      });
      return {
        id,
        ...(input.commissionId ? { commissionId: input.commissionId } : {}),
        electoralRollId: input.electoralRollId,
        electoralRollSnapshotId: electoralRollSnapshot.id,
        status: "DRAFT",
      };
    }

    return request<CreateVoteResult>(fetcher, baseUrl, "/votes", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async function updateVote(input: UpdateVoteInput) {
    if (mode === "mock") {
      const vote = voteFixtureDetails.find((item) => item.id === input.voteId);
      if (!vote) {
        throw new Error("투표를 찾을 수 없습니다.");
      }
      if (vote.status !== "draft" && vote.status !== "scheduled") {
        throw new Error("초안 투표만 수정할 수 있습니다.");
      }

      vote.title = input.title;
      vote.votingChannels = [...input.votingChannels];
      vote.defaultPolicy = { ...input.defaultPolicy };
      vote.identityVerificationPolicy = {
        ...input.identityVerificationPolicy,
      };
      return { id: vote.id, status: "DRAFT" as const };
    }

    const { voteId, ...body } = input;
    return request<CreateEntityResponse>(
      fetcher,
      baseUrl,
      `/votes/${encode(voteId)}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  }

  async function createSubVote(input: CreateSubVoteInput) {
    if (mode === "mock") {
      const id = nextMockId("sub-vote");
      const parent = voteFixtureDetails.find((vote) => vote.id === input.voteId);
      const subVote: SubVoteOperations = {
        id,
        voteId: input.voteId,
        title: input.title,
        description: "",
        type: input.type,
        status: "DRAFT",
        sortOrder: input.sortOrder ?? 0,
        policy: {
          privacyMode: input.overrides?.privacyMode ?? "SECRET",
          participationUnit: input.overrides?.participationUnit ?? "INDIVIDUAL",
          resultStorageMode: input.overrides?.resultStorageMode ?? "DATABASE",
          voteWeightMode: input.overrides?.voteWeightMode ?? "EQUAL",
        },
        candidates: [],
        turnout: null,
        result: null,
      };
      mockState.subVotes.push(subVote);
      parent?.subVotes.push({
        id,
        title: input.title,
        description: "",
        type: input.type === "YES_NO" ? "yes-no" : "candidate",
        status: "draft",
        order: input.sortOrder ?? 0,
        candidates: [],
      });
      return { id, voteId: input.voteId, status: "DRAFT" as const };
    }

    const { voteId, ...body } = input;
    return request<CreateEntityResponse>(
      fetcher,
      baseUrl,
      `/votes/${encode(voteId)}/sub-votes`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  }

  async function createCandidate(input: CreateCandidateInput) {
    if (mode === "mock") {
      const id = nextMockId("candidate");
      const candidate: OperationCandidate = {
        id,
        candidateNo: input.candidateNo,
        name: input.name,
        description: "",
        status: "ACTIVE",
      };
      const subVote = mockState.subVotes.find(
        (item) =>
          item.voteId === input.voteId && item.id === input.voteDetailId,
      );
      subVote?.candidates.push(candidate);
      const parent = voteFixtureDetails.find((vote) => vote.id === input.voteId);
      parent?.candidates.push({
        id,
        name: input.name,
        description: "",
        order: input.candidateNo,
      });
      parent?.subVotes
        .find((item) => item.id === input.voteDetailId)
        ?.candidates.push({
          id,
          name: input.name,
          description: "",
          order: input.candidateNo,
        });
      return { id, voteDetailId: input.voteDetailId, status: "ACTIVE" as const };
    }

    const { voteId, voteDetailId, ...body } = input;
    return request<CreateEntityResponse>(
      fetcher,
      baseUrl,
      `/votes/${encode(voteId)}/sub-votes/${encode(voteDetailId)}/candidates`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  }

  async function createElector(input: CreateElectorInput) {
    if (mode === "mock") {
      const elector: ElectorRecord = {
        ...input,
        id: nextMockId("elector"),
        voteWeight: input.voteWeight ?? 1,
        status: "ELIGIBLE",
        identityVerified: false,
      };
      mockState.electors.push(elector);
      const parent = voteFixtureDetails.find((vote) => vote.id === input.voteId);
      if (parent) {
        parent.electorCount += 1;
        parent.electors.push({
          id: elector.id,
          name: elector.name,
          label: elector.groupKey ?? elector.identifier,
          participated: false,
          participatedAt: null,
          participationKnown: true,
        });
      }
      return elector;
    }

    const { voteId, ...body } = input;
    const response = await request<CreateElectorResponseDto>(
      fetcher,
      baseUrl,
      `/votes/${encode(voteId)}/electors`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    return {
      ...response,
      groupKey: input.groupKey,
      identifier: input.identifier,
      identityVerified: false,
      voteWeight: input.voteWeight ?? 1,
    };
  }

  async function fetchCommissions(
    page = 1,
    pageSize = 20,
  ): Promise<PageResult<CommissionRecord>> {
    if (mode === "mock") {
      return paginate(mockState.commissions, page, pageSize);
    }

    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    const commissionPage = await request<PageDto<CommissionSummaryDto>>(
      fetcher,
      baseUrl,
      "/election-commissions",
      {},
      query,
    );
    const items = await Promise.all(
      commissionPage.items.map(async (commission) =>
        toCommission(
          await request<CommissionDetailDto>(
            fetcher,
            baseUrl,
            `/election-commissions/${encode(commission.id)}`,
          ),
        ),
      ),
    );

    return { ...commissionPage, items };
  }

  async function createCommission(name: string): Promise<CommissionRecord> {
    if (mode === "mock") {
      const commission: CommissionRecord = {
        id: nextMockId("commission"),
        name,
        status: "ACTIVE",
        members: [],
      };
      mockState.commissions.push(commission);
      return commission;
    }

    const response = await request<CreateEntityResponse>(
      fetcher,
      baseUrl,
      "/election-commissions",
      { method: "POST", body: JSON.stringify({ name }) },
    );
    return { id: response.id, name, status: "ACTIVE", members: [] };
  }

  async function registerCommissionMember(input: {
    commissionId: string;
    name: string;
    role: "ADMIN" | "FIELD_MANAGER";
  }) {
    if (mode === "mock") {
      const member = {
        id: nextMockId("commission-member"),
        name: input.name,
        role: input.role,
        status: "ACTIVE" as const,
      };
      mockState.commissions
        .find((item) => item.id === input.commissionId)
        ?.members.push(member);
      return member;
    }

    const response = await request<CreateEntityResponse>(
      fetcher,
      baseUrl,
      `/election-commissions/${encode(input.commissionId)}/members`,
      {
        method: "POST",
        body: JSON.stringify({ name: input.name, role: input.role }),
      },
    );
    return { id: response.id, name: input.name, role: input.role, status: "ACTIVE" as const };
  }

  async function fetchFieldSessions(
    voteId: string,
    page = 1,
    pageSize = 20,
  ): Promise<PageResult<FieldSessionRecord>> {
    if (mode === "mock") {
      return paginate(
        mockState.fieldSessions.filter((item) => item.voteId === voteId),
        page,
        pageSize,
      );
    }

    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    return request<PageDto<FieldSessionDto>>(
      fetcher,
      baseUrl,
      `/votes/${encode(voteId)}/field-voting-sessions`,
      {},
      query,
    );
  }

  async function createFieldSession(input: CreateFieldSessionInput) {
    if (mode === "mock") {
      const session: FieldSessionRecord = {
        ...input,
        id: nextMockId("field-session"),
        status: "SCHEDULED",
      };
      mockState.fieldSessions.push(session);
      return session;
    }

    const { voteId, ...body } = input;
    const response = await request<CreateEntityResponse>(
      fetcher,
      baseUrl,
      `/votes/${encode(voteId)}/field-voting-sessions`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return { ...input, id: response.id, status: "SCHEDULED" as const };
  }

  async function changeFieldSessionStatus(
    fieldVotingSessionId: string,
    action: "open" | "close" | "cancel",
  ) {
    const statusByAction = {
      open: "OPEN",
      close: "CLOSED",
      cancel: "CANCELED",
    } as const;
    const status: FieldSessionStatus = statusByAction[action];

    if (mode === "mock") {
      const session = mockState.fieldSessions.find(
        (item) => item.id === fieldVotingSessionId,
      );
      if (!session) {
        throw new Error("현장 투표 세션을 찾을 수 없습니다.");
      }
      session.status = status;
      return { id: session.id, status };
    }

    return request<{ id: string; status: FieldSessionStatus }>(
      fetcher,
      baseUrl,
      `/field-voting-sessions/${encode(fieldVotingSessionId)}/${action}`,
      {
        method: "POST",
        body: JSON.stringify({ changedAt: new Date().toISOString() }),
      },
    );
  }

  return {
    changeFieldSessionStatus,
    createCandidate,
    createCommission,
    createElector,
    createFieldSession,
    createSubVote,
    createVote,
    updateVote,
    fetchCommissions,
    fetchElectors,
    fetchFieldSessions,
    fetchSubVoteOperations,
    mode,
    registerCommissionMember,
  };
}

export const voteOperationsApi = createVoteOperationsApiClient();
