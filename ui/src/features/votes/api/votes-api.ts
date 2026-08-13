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
  VoteSummary,
} from "@/features/votes/model/vote.types";

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
  fallbackVoteDetails?: VoteDetail[];
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

function mapVoteStatus(status: string): VoteStatus {
  switch (status) {
    case "DRAFT":
      return "draft";
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
): VoteSummary {
  return {
    id: response.id,
    title: response.title,
    status: mapVoteStatus(response.status),
    startsAt: response.startedAt,
    endsAt: response.endedAt,
    electorCount: response.electorCount ?? 0,
    participatedCount: response.participatedCount ?? 0,
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

function mapVoteElectorResponse(response: VoteElectorResponseDto): VoteElector {
  return {
    id: response.id,
    name: response.name,
    label: response.groupKey ?? response.identifier,
    participated: response.participated ?? false,
    participatedAt: response.participatedAt ?? null,
  };
}

export function mapVoteDetailResponse(
  response: VoteDetailResponseDto,
  electors: VoteElectorResponseDto[] = [],
): VoteDetail {
  const mappedElectors = electors.map(mapVoteElectorResponse);
  const participatedCount = mappedElectors.filter(
    (elector) => elector.participated,
  ).length;

  return {
    ...mapVoteSummaryResponse(response),
    electorCount: response.electorCount ?? mappedElectors.length,
    participatedCount: response.participatedCount ?? participatedCount,
    description: response.description,
    candidates: response.voteDetails.flatMap((voteDetail) =>
      voteDetail.candidates.map(mapVoteCandidateResponse),
    ),
    electors: mappedElectors,
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
  const baseUrl = options.baseUrl ?? resolveVoteApiBaseUrl();
  const fetcher = options.fetcher ?? fetch;
  const fallbackVoteDetails = options.fallbackVoteDetails ?? voteFixtureDetails;
  const now = options.now ?? (() => new Date().toISOString());

  async function fetchVoteList(): Promise<VoteSummary[]> {
    if (baseUrl.trim().length === 0) {
      return fallbackVoteDetails.map(toVoteSummary);
    }

    const response = await requestVoteApiPage<VoteSummaryResponseDto>("/votes", {
      baseUrl,
      fetcher,
    });

    return response.map(mapVoteSummaryResponse);
  }

  async function fetchVoteDetail(voteId: string): Promise<VoteDetail | null> {
    if (baseUrl.trim().length === 0) {
      return findVoteDetail(fallbackVoteDetails, voteId);
    }

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

    return mapVoteDetailResponse(response, electors);
  }

  async function fetchVoteDashboard(): Promise<VoteDashboard> {
    return buildVoteDashboard(await fetchVoteList(), now());
  }

  return {
    fetchVoteDashboard,
    fetchVoteDetail,
    fetchVoteList,
  };
}
