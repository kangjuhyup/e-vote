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

export interface VoteSummaryResponseDto {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  electorCount: number;
  participatedCount: number;
}

export interface VoteCandidateResponseDto {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface VoteElectorResponseDto {
  id: string;
  name: string;
  label: string;
  participated: boolean;
  participatedAt: string | null;
}

export interface VoteDetailResponseDto extends VoteSummaryResponseDto {
  description: string;
  candidates: VoteCandidateResponseDto[];
  electors: VoteElectorResponseDto[];
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

function buildVoteApiUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
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
    startsAt: response.startsAt,
    endsAt: response.endsAt,
    electorCount: response.electorCount,
    participatedCount: response.participatedCount,
  };
}

function mapVoteCandidateResponse(
  response: VoteCandidateResponseDto,
): VoteCandidate {
  return {
    id: response.id,
    name: response.name,
    description: response.description,
    order: response.order,
  };
}

function mapVoteElectorResponse(response: VoteElectorResponseDto): VoteElector {
  return {
    id: response.id,
    name: response.name,
    label: response.label,
    participated: response.participated,
    participatedAt: response.participatedAt,
  };
}

export function mapVoteDetailResponse(
  response: VoteDetailResponseDto,
): VoteDetail {
  return {
    ...mapVoteSummaryResponse(response),
    description: response.description,
    candidates: response.candidates.map(mapVoteCandidateResponse),
    electors: response.electors.map(mapVoteElectorResponse),
  };
}

function fetchVoteApiResponse(
  path: string,
  input: { baseUrl: string; fetcher: VoteApiFetcher },
): Promise<Response> {
  return input.fetcher(buildVoteApiUrl(input.baseUrl, path), {
    headers: { Accept: "application/json" },
  });
}

async function requestVoteApi<T>(
  path: string,
  input: { baseUrl: string; fetcher: VoteApiFetcher },
): Promise<T> {
  const response = await fetchVoteApiResponse(path, input);

  if (!response.ok) {
    throw new Error(`Vote API request failed: ${response.status}`);
  }

  return unwrapVoteApiResponse<T>(await response.json());
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

    const response = await requestVoteApi<VoteSummaryResponseDto[]>("/votes", {
      baseUrl,
      fetcher,
    });

    return response.map(mapVoteSummaryResponse);
  }

  async function fetchVoteDetail(voteId: string): Promise<VoteDetail | null> {
    if (baseUrl.trim().length === 0) {
      return findVoteDetail(fallbackVoteDetails, voteId);
    }

    const response = await fetchVoteApiResponse(
      `/votes/${encodeURIComponent(voteId)}`,
      {
        baseUrl,
        fetcher,
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Vote API request failed: ${response.status}`);
    }

    return mapVoteDetailResponse(
      unwrapVoteApiResponse<VoteDetailResponseDto>(await response.json()),
    );
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
