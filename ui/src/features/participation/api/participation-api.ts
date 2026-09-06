import { unwrapVoteApiResponse } from '@/features/votes/api/votes-api';
import { toVoteApiError, VoteApiError } from '@/shared/api/vote-api-error';
import { voteApiFetch } from '@/shared/auth/vote-api-fetch';
import { isApiMockMode } from '@/shared/config/api-mode';

import type {
  AuthenticateParticipantInput,
  AuthenticateParticipantResult,
  CastParticipationInput,
  CastParticipationResult,
  GetParticipationAccessInput,
  ParticipationAccess,
  ParticipationAccessState,
} from '../model/participation.types';

type ApiFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface ParticipationApiClientOptions {
  baseUrl?: string;
  fetcher?: ApiFetcher;
  mode?: 'live' | 'mock';
  randomUuid?: () => string;
}

interface VoteDetailResponseDto {
  description: string;
  endedAt: string;
  id: string;
  identityVerificationPolicy: { required: boolean };
  startedAt: string;
  status: string;
  title: string;
  voteDetails: Array<{
    candidates: Array<{
      candidateNo: number;
      description: string;
      id: string;
      name: string;
      status: string;
    }>;
    description: string;
    id: string;
    sortOrder: number;
    status: string;
    title: string;
    type: string;
  }>;
  votingChannels: string[];
}

interface AuthenticateElectorResponseDto {
  id: string;
  identityVerified: boolean;
  voteId: string;
}

interface CastParticipationResponseDto {
  id: string;
  status: string;
  voteDetailId: string;
}

const mockAccess: ParticipationAccess = {
  ballots: [
    {
      candidates: [
        {
          candidateNo: 1,
          description: '정기적인 운영 보고와 투명한 의사결정을 약속합니다.',
          id: '33333333-3333-4333-8333-333333333333',
          name: '김도윤',
        },
        {
          candidateNo: 2,
          description: '구성원의 의견이 반영되는 참여 중심 운영을 만들겠습니다.',
          id: '44444444-4444-4444-8444-444444444444',
          name: '이지안',
        },
      ],
      description: '앞으로 2년간 우리 협회를 대표할 회장을 선출합니다.',
      id: '22222222-2222-4222-8222-222222222222',
      participated: false,
      sortOrder: 1,
      status: 'OPEN',
      title: '회장 선출',
      type: 'CANDIDATE',
    },
  ],
  elector: { identityVerified: false, label: 'Mock 선거인' },
  vote: {
    description: '후보자와 안건 내용을 확인한 뒤 투표해 주세요.',
    endedAt: '2026-09-12T09:00:00.000Z',
    id: '11111111-1111-4111-8111-111111111111',
    identityVerificationRequired: true,
    startedAt: '2026-09-06T00:00:00.000Z',
    status: 'OPEN',
    title: '2026년 협회 임원 선출 투표',
    votingChannels: ['ONLINE'],
  },
};

function resolveBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_VOTE_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    ''
  ).replace(/\/+$/, '');
}

function encode(value: string) {
  return encodeURIComponent(value);
}

function mapStatus(value: string): ParticipationAccessState {
  if (
    value === 'DRAFT' ||
    value === 'FINALIZED' ||
    value === 'OPEN' ||
    value === 'CLOSED' ||
    value === 'CANCELED'
  ) {
    return value;
  }
  throw new Error(`Unsupported participation status: ${value}`);
}

function mapVoteDetail(
  response: VoteDetailResponseDto,
  electorLabel: string,
): ParticipationAccess {
  return {
    ballots: response.voteDetails
      .map((ballot) => ({
        candidates: ballot.candidates
          .filter((candidate) => candidate.status === 'ACTIVE')
          .map((candidate) => ({
            candidateNo: candidate.candidateNo,
            description: candidate.description,
            id: candidate.id,
            name: candidate.name,
          })),
        description: ballot.description,
        id: ballot.id,
        participated: false,
        sortOrder: ballot.sortOrder,
        status: mapStatus(ballot.status),
        title: ballot.title,
        type:
          ballot.type === 'YES_NO'
            ? ('YES_NO' as const)
            : ('CANDIDATE' as const),
      }))
      .sort((left, right) => left.sortOrder - right.sortOrder),
    elector: { identityVerified: false, label: electorLabel },
    vote: {
      description: response.description,
      endedAt: response.endedAt,
      id: response.id,
      identityVerificationRequired:
        response.identityVerificationPolicy.required,
      startedAt: response.startedAt,
      status: mapStatus(response.status),
      title: response.title,
      votingChannels: response.votingChannels.filter(
        (channel): channel is 'ONLINE' | 'ONSITE' | 'VISIT' =>
          channel === 'ONLINE' || channel === 'ONSITE' || channel === 'VISIT',
      ),
    },
  };
}

async function request<T>(
  fetcher: ApiFetcher,
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (baseUrl.length === 0) {
    throw new Error('NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode');
  }

  const response = await fetcher(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw await toVoteApiError(response);
  return unwrapVoteApiResponse<T>(await response.json());
}

function assertAuthenticationResponse(
  response: AuthenticateElectorResponseDto,
): AuthenticateParticipantResult {
  if (
    typeof response.id !== 'string' ||
    typeof response.voteId !== 'string' ||
    typeof response.identityVerified !== 'boolean'
  ) {
    throw new Error('Unexpected elector authentication response');
  }
  return {
    electorId: response.id,
    identityVerified: response.identityVerified,
    voteId: response.voteId,
  };
}

function assertCastResponse(
  response: CastParticipationResponseDto,
): CastParticipationResult {
  if (
    typeof response.id !== 'string' ||
    typeof response.voteDetailId !== 'string' ||
    response.status !== 'CAST'
  ) {
    throw new Error('Unexpected participation response');
  }
  return {
    id: response.id,
    status: 'CAST',
    voteDetailId: response.voteDetailId,
  };
}

export function createParticipationApiClient(
  options: ParticipationApiClientOptions = {},
) {
  const mode = options.mode ?? (isApiMockMode() ? 'mock' : 'live');
  const baseUrl = (options.baseUrl ?? resolveBaseUrl()).replace(/\/+$/, '');
  const fetcher = options.fetcher ?? voteApiFetch;
  const randomUuid = options.randomUuid ?? (() => crypto.randomUUID());

  return {
    async getAccess(
      input: GetParticipationAccessInput,
    ): Promise<ParticipationAccess> {
      if (mode === 'mock') {
        return {
          ...structuredClone(mockAccess),
          elector: { identityVerified: false, label: input.electorLabel },
          vote: { ...mockAccess.vote, id: input.voteId },
        };
      }
      const response = await request<VoteDetailResponseDto>(
        fetcher,
        baseUrl,
        `/votes/${encode(input.voteId)}`,
      );
      return mapVoteDetail(response, input.electorLabel);
    },

    async authenticate(
      input: AuthenticateParticipantInput,
    ): Promise<AuthenticateParticipantResult> {
      if (mode === 'mock') {
        return {
          electorId: input.electorId,
          identityVerified: true,
          voteId: input.voteId,
        };
      }
      const response = await request<AuthenticateElectorResponseDto>(
        fetcher,
        baseUrl,
        `/votes/${encode(input.voteId)}/electors/${encode(input.electorId)}/authentication`,
        {
          method: 'PUT',
          body: JSON.stringify({
            provider: 'MOCK',
            transactionId: `mock-success:${randomUuid()}`,
          }),
        },
      );
      const result = assertAuthenticationResponse(response);
      if (result.electorId !== input.electorId || result.voteId !== input.voteId) {
        throw new Error('Unexpected elector authentication target');
      }
      return result;
    },

    async cast(
      input: CastParticipationInput,
    ): Promise<CastParticipationResult> {
      if (mode === 'mock') {
        return {
          id: randomUuid(),
          status: 'CAST',
          voteDetailId: input.voteDetailId,
        };
      }
      const response = await request<CastParticipationResponseDto>(
        fetcher,
        baseUrl,
        '/participations',
        {
          method: 'POST',
          body: JSON.stringify({
            voteId: input.voteId,
            voteDetailId: input.voteDetailId,
            electorId: input.electorId,
            selectedCandidateId: input.selectedCandidateId,
            votingChannel: 'ONLINE',
          }),
        },
      );
      const result = assertCastResponse(response);
      if (result.voteDetailId !== input.voteDetailId) {
        throw new Error('Unexpected participation target');
      }
      return result;
    },
  };
}

export function getParticipationErrorMessage(
  error: unknown,
  operation: 'load' | 'authenticate' | 'cast',
) {
  if (error instanceof VoteApiError) {
    if (error.status === 401)
      return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
    if (error.status === 403)
      return '현재 로그인한 계정에 연결된 선거인이 아닙니다.';
    if (error.status === 409) {
      return operation === 'cast'
        ? '이미 참여했거나 현재 투표 상태가 변경되었습니다. 중복 제출은 완료로 처리되지 않습니다.'
        : '이미 사용한 인증 요청이거나 현재 인증 상태와 충돌했습니다. 다시 시도해 주세요.';
    }
    if (error.status === 503)
      return '개발용 Mock 본인확인이 활성화되어 있지 않습니다. 서버 설정을 확인해 주세요.';
    if (error.status === 404)
      return '투표 또는 선거인 정보를 찾을 수 없습니다.';
  }

  if (operation === 'load')
    return '참여할 투표 정보를 불러오지 못했습니다.';
  if (operation === 'authenticate')
    return '개발용 Mock 본인확인에 실패했습니다.';
  return '선택을 제출하지 못했습니다. 다시 시도해 주세요.';
}

export const participationApi = createParticipationApiClient();
