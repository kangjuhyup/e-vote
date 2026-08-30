import {
  buildVoteDashboard,
  findVoteDetail,
  toVoteSummary,
} from "@/features/votes/model/vote-selectors";
import type {
  VoteCandidate,
  VoteDashboard,
  VoteDetail,
  VoteElector,
  VoteStatus,
  VoteSubVote,
  VoteSummary,
} from "@/features/votes/model/vote.types";
import {
  isApiMockMode,
  resolveApiMode,
  type ApiMode,
} from "@/shared/config/api-mode";

import { voteFixtureDetails } from "./votes-fixtures";

type VoteApiResponse<T> = {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
};

type VoteApiFetcher = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

const VOTE_API_PAGE_SIZE = 100;

export type VoteApiMode = ApiMode;

interface VoteApiPageResponse<TItem> {
  items: TItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface VotePolicyResponseDto {
  privacyMode: string;
  participationUnit: string;
  resultStorageMode: string;
  voteWeightMode: string;
}

interface IdentityVerificationPolicyResponseDto {
  required: boolean;
  provider?: string;
  method?: string;
}

export interface VoteSummaryResponseDto {
  id: string;
  commissionId: string;
  title: string;
  votingChannels: string[];
  defaultPolicy: VotePolicyResponseDto;
  identityVerificationPolicy: IdentityVerificationPolicyResponseDto;
  status: string;
  startedAt: string;
  endedAt: string;
  createdAt: string;
  updatedAt: string;
  electorCount?: number;
  participatedCount?: number;
}

export interface VoteCandidateResponseDto {
  id: string;
  voteId?: string;
  voteDetailId: string;
  candidateNo: number;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface VoteDetailItemResponseDto {
  id: string;
  voteId: string;
  title: string;
  description: string;
  type: string;
  sortOrder: number;
  status: string;
  candidates: VoteCandidateResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface VoteElectorResponseDto {
  id: string;
  voteId: string;
  name: string;
  identifier: string;
  phoneNumber?: string;
  birthDate?: string;
  groupKey?: string;
  voteWeight: number;
  status: string;
  identityVerified: boolean;
  participated?: boolean;
  participatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoteDetailResponseDto extends VoteSummaryResponseDto {
  description: string;
  voteDetails: VoteDetailItemResponseDto[];
}

interface CreateVotesApiClientOptions {
  baseUrl?: string;
  fetcher?: VoteApiFetcher;
  mockVoteDetails?: VoteDetail[];
  mode?: VoteApiMode;
  now?: () => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveVoteApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_VOTE_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    ""
  );
}

export function resolveVoteApiMode(
  value = process.env.NEXT_PUBLIC_VOTE_API_MODE,
): VoteApiMode {
  return resolveApiMode(value);
}

export function isVoteApiMockMode() {
  return isApiMockMode();
}

function requireLiveVoteApiBaseUrl(baseUrl: string) {
  if (baseUrl.trim().length === 0) {
    throw new Error(
      "NEXT_PUBLIC_VOTE_API_BASE_URL is required when NEXT_PUBLIC_VOTE_API_MODE=live",
    );
  }
}

function buildVoteApiUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number>,
) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const searchParams = new URLSearchParams();

  Object.entries(query ?? {}).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });

  const search = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

  return `${normalizedBaseUrl}${normalizedPath}${search}`;
}

function hasKnownVoteParticipationCounts(response: VoteSummaryResponseDto) {
  return (
    typeof response.electorCount === "number" &&
    typeof response.participatedCount === "number"
  );
}

function hasKnownElectorParticipation(response: VoteElectorResponseDto) {
  return typeof response.participated === "boolean";
}

function startsAfter(startedAt: string, now: string) {
  const startedAtTime = Date.parse(startedAt);
  const nowTime = Date.parse(now);

  return (
    Number.isFinite(startedAtTime) &&
    Number.isFinite(nowTime) &&
    startedAtTime > nowTime
  );
}

function mapVoteStatus(
  status: string,
  input: { startedAt: string; now: string },
): VoteStatus {
  switch (status) {
    case "DRAFT":
      return startsAfter(input.startedAt, input.now) ? "scheduled" : "draft";
    case "OPEN":
      return "active";
    case "CLOSED":
      return "completed";
    case "CANCELED":
      return "canceled";
    default:
      throw new Error(`Unsupported vote status: ${status}`);
  }
}

export function unwrapVoteApiResponse<T>(payload: unknown): T {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !Object.prototype.hasOwnProperty.call(payload, "data")
  ) {
    throw new Error("Unexpected vote API response");
  }

  return (payload as VoteApiResponse<T>).data;
}

export function mapVoteSummaryResponse(
  response: VoteSummaryResponseDto,
  now = new Date().toISOString(),
): VoteSummary {
  const participationKnown = hasKnownVoteParticipationCounts(response);

  return {
    id: response.id,
    title: response.title,
    status: mapVoteStatus(response.status, {
      startedAt: response.startedAt,
      now,
    }),
    startsAt: response.startedAt,
    endsAt: response.endedAt,
    electorCount: response.electorCount ?? 0,
    participatedCount: response.participatedCount ?? 0,
    participationKnown,
  };
}

function mapVoteCandidateResponse(
  response: VoteCandidateResponseDto,
): VoteCandidate {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    order: response.candidateNo,
  };
}

function mapVoteSubVoteResponse(
  response: VoteDetailItemResponseDto,
  now: string,
): VoteSubVote {
  return {
    id: response.id,
    title: response.title,
    description: response.description,
    type: response.type === "YES_NO" ? "yes-no" : "candidate",
    status: mapVoteStatus(response.status, { startedAt: now, now }),
    order: response.sortOrder,
    candidates: response.candidates.map(mapVoteCandidateResponse),
  };
}

function mapVoteElectorResponse(response: VoteElectorResponseDto): VoteElector {
  return {
    id: response.id,
    name: response.name,
    label: response.groupKey ?? response.identifier,
    participated: response.participated ?? false,
    participatedAt: response.participatedAt ?? null,
    participationKnown: hasKnownElectorParticipation(response),
  };
}

export function mapVoteDetailResponse(
  response: VoteDetailResponseDto,
  electors: VoteElectorResponseDto[] = [],
  now = new Date().toISOString(),
): VoteDetail {
  const mappedElectors = electors.map(mapVoteElectorResponse);
  const electorsHaveKnownParticipation =
    electors.length > 0 && electors.every(hasKnownElectorParticipation);
  const participationKnown =
    hasKnownVoteParticipationCounts(response) || electorsHaveKnownParticipation;
  const participatedCount =
    response.participatedCount ??
    (electorsHaveKnownParticipation
      ? mappedElectors.filter((elector) => elector.participated).length
      : 0);

  return {
    ...mapVoteSummaryResponse(response, now),
    electorCount: response.electorCount ?? mappedElectors.length,
    participatedCount,
    participationKnown,
    description: response.description,
    candidates: response.voteDetails.flatMap((voteDetail) =>
      voteDetail.candidates.map(mapVoteCandidateResponse),
    ),
    electors: mappedElectors,
    subVotes: response.voteDetails.map((voteDetail) =>
      mapVoteSubVoteResponse(voteDetail, now),
    ),
  };
}

function fetchVoteApiResponse(
  path: string,
  input: { baseUrl: string; fetcher: VoteApiFetcher },
  query?: Record<string, string | number>,
): Promise<Response> {
  return input.fetcher(buildVoteApiUrl(input.baseUrl, path, query), {
    headers: { Accept: "application/json" },
  });
}

async function requestVoteApi<T>(
  path: string,
  input: { baseUrl: string; fetcher: VoteApiFetcher },
  query?: Record<string, string | number>,
): Promise<T> {
  const response = await fetchVoteApiResponse(path, input, query);

  if (!response.ok) {
    throw new Error(`Vote API request failed: ${response.status}`);
  }

  return unwrapVoteApiResponse<T>(await response.json());
}

async function requestVoteApiOrNull<T>(
  path: string,
  input: { baseUrl: string; fetcher: VoteApiFetcher },
): Promise<T | null> {
  const response = await fetchVoteApiResponse(path, input);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Vote API request failed: ${response.status}`);
  }

  return unwrapVoteApiResponse<T>(await response.json());
}

async function requestVoteApiPage<T>(
  path: string,
  input: { baseUrl: string; fetcher: VoteApiFetcher },
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await requestVoteApi<VoteApiPageResponse<T>>(
      path,
      input,
      {
        page,
        pageSize: VOTE_API_PAGE_SIZE,
      },
    );

    items.push(...response.items);
    totalPages = response.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
}

export function createVotesApiClient(options: CreateVotesApiClientOptions = {}) {
  const mode = options.mode ?? resolveVoteApiMode();
  const baseUrl = options.baseUrl ?? resolveVoteApiBaseUrl();
  const fetcher = options.fetcher ?? fetch;
  const mockVoteDetails = options.mockVoteDetails ?? voteFixtureDetails;
  const now = options.now ?? (() => new Date().toISOString());

  async function fetchVoteDetailFromServer(
    voteId: string,
    requestTime: string,
  ): Promise<VoteDetail | null> {
    const encodedVoteId = encodeURIComponent(voteId);
    const response = await requestVoteApiOrNull<VoteDetailResponseDto>(
      `/votes/${encodedVoteId}`,
      {
        baseUrl,
        fetcher,
      },
    );

    if (response === null) {
      return null;
    }

    const electors = await requestVoteApiPage<VoteElectorResponseDto>(
      `/votes/${encodedVoteId}/electors`,
      { baseUrl, fetcher },
    );

    return mapVoteDetailResponse(response, electors, requestTime);
  }

  async function fetchVoteList(): Promise<VoteSummary[]> {
    if (mode === "mock") {
      return mockVoteDetails.map(toVoteSummary);
    }

    requireLiveVoteApiBaseUrl(baseUrl);

    const requestTime = now();
    const response = await requestVoteApiPage<VoteSummaryResponseDto>("/votes", {
      baseUrl,
      fetcher,
    });

    return Promise.all(
      response.map(async (vote) => {
        const detail = await fetchVoteDetailFromServer(vote.id, requestTime);

        return detail
          ? toVoteSummary(detail)
          : mapVoteSummaryResponse(vote, requestTime);
      }),
    );
  }

  async function fetchVoteDetail(voteId: string): Promise<VoteDetail | null> {
    if (mode === "mock") {
      return findVoteDetail(mockVoteDetails, voteId);
    }

    requireLiveVoteApiBaseUrl(baseUrl);

    return fetchVoteDetailFromServer(voteId, now());
  }

  async function fetchVoteDashboard(): Promise<VoteDashboard> {
    return buildVoteDashboard(await fetchVoteList(), now());
  }

  return {
    fetchVoteDashboard,
    fetchVoteDetail,
    fetchVoteList,
    mode,
  };
}
