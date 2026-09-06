import { unwrapVoteApiResponse } from '@/features/votes/api/votes-api';
import { isApiMockMode } from '@/shared/config/api-mode';
import { toVoteApiError, VoteApiError } from '@/shared/api/vote-api-error';

import type {
  ParticipationAccessSession,
  ParticipationResult,
} from '../model/participation-access.types';
import type {
  ConfirmSignatureUploadResult,
  RequestSignatureUploadResult,
  SignatureUploadMetadata,
  SignatureUploadStage,
} from '../model/participation.types';

type ApiFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface ClientOptions {
  baseUrl?: string;
  fetcher?: ApiFetcher;
  mode?: 'live' | 'mock';
  storageFetcher?: ApiFetcher;
}

interface UploadSignatureInput {
  blob: Blob;
  csrfToken: string;
  onStage?: (stage: SignatureUploadStage) => void;
  originalName: string;
}

const mockSession: ParticipationAccessSession = {
  csrfToken: 'preview-csrf-token',
  hasConfirmedSignature: false,
  permittedActions: {
    participate: true,
    readResults: false,
    uploadSignature: true,
  },
  scope: 'PARTICIPATE',
  vote: {
    description: '후보자와 안건 내용을 확인한 뒤 투표해 주세요.',
    endedAt: '2026-09-12T09:00:00.000Z',
    id: '11111111-1111-4111-8111-111111111111',
    startedAt: '2026-09-06T00:00:00.000Z',
    status: 'OPEN',
    title: '2026년 협회 임원 선출 투표',
  },
  voteDetails: [
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
};

function resolveBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_PARTICIPATION_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_VOTE_API_BASE_URL ??
    '';
  if (/^https?:\/\//.test(configured)) return configured.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return '';
}

function encode(value: string) {
  return encodeURIComponent(value);
}

async function request<T>(
  fetcher: ApiFetcher,
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  expectedStatus?: number,
): Promise<T> {
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode');
  }
  const response = await fetcher(`${baseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw await toVoteApiError(response);
  if (expectedStatus && response.status !== expectedStatus) {
    throw new VoteApiError(`Unexpected response status: ${response.status}`, response.status);
  }
  return unwrapVoteApiResponse<T>(await response.json());
}

function mutationHeaders(csrfToken: string) {
  return { 'x-csrf-token': csrfToken };
}

function sanitizeSession(response: ParticipationAccessSession): ParticipationAccessSession {
  return {
    scope: response.scope,
    ...(response.vote ? { vote: response.vote } : {}),
    ...(response.voteDetails ? { voteDetails: response.voteDetails } : {}),
    ...(response.hasConfirmedSignature !== undefined
      ? { hasConfirmedSignature: response.hasConfirmedSignature }
      : {}),
    ...(response.permittedActions ? { permittedActions: response.permittedActions } : {}),
    ...(response.csrfToken ? { csrfToken: response.csrfToken } : {}),
  };
}

export function consumeParticipationAccessToken(
  location: Pick<Location, 'hash' | 'pathname' | 'search'>,
  history: Pick<History, 'replaceState' | 'state'>,
) {
  const token = new URLSearchParams(location.hash.slice(1)).get('access_token');
  if (location.hash) {
    history.replaceState(history.state, '', `${location.pathname}${location.search}`);
  }
  return token;
}

export function getParticipationAccessErrorMessage(error: unknown) {
  if (error instanceof VoteApiError) {
    if (error.status === 401)
      return '참여 링크가 유효하지 않거나 폐기되었습니다. 관리자에게 새 링크를 요청해 주세요.';
    if (error.status === 403)
      return '이 주소에서는 요청을 처리할 수 없거나 보안 확인 정보가 만료되었습니다. 문자 링크를 다시 열어 주세요.';
    if (error.status === 409)
      return '이 링크는 다른 브라우저에서 사용 중이거나 현재 투표 상태와 맞지 않습니다. 관리자에게 참여 링크 재발급을 요청해 주세요.';
    if (error.status === 429)
      return '링크 확인 요청이 너무 많습니다. 잠시 후 문자로 받은 링크를 다시 열어 주세요.';
    if (error.status === 503)
      return '참여 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
  }
  return '참여 정보를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export function createParticipationAccessApiClient(options: ClientOptions = {}) {
  const mode = options.mode ?? (isApiMockMode() ? 'mock' : 'live');
  const configuredBaseUrl = options.baseUrl?.replace(/\/+$/, '');
  const fetcher = options.fetcher ?? fetch;
  const storageFetcher = options.storageFetcher ?? fetch;
  const apiBaseUrl = () => configuredBaseUrl ?? resolveBaseUrl();

  return {
    async exchange(token: string) {
      if (mode === 'mock') return structuredClone(mockSession);
      return sanitizeSession(await request<ParticipationAccessSession>(fetcher, apiBaseUrl(), '/participation-access/exchange', {
        body: JSON.stringify({ token }),
        method: 'POST',
      }));
    },
    async getAccess() {
      if (mode === 'mock') return structuredClone(mockSession);
      return sanitizeSession(await request<ParticipationAccessSession>(fetcher, apiBaseUrl(), '/participation-access'));
    },
    async uploadSignature(input: UploadSignatureInput) {
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(input.blob.type) ||
        input.blob.size < 1 ||
        input.blob.size > 5 * 1024 * 1024
      ) {
        throw new Error('서명은 PNG, JPEG, WebP 형식의 5MiB 이하 이미지여야 합니다.');
      }
      const metadata: SignatureUploadMetadata = {
        mimeType: input.blob.type as SignatureUploadMetadata['mimeType'],
        originalName: input.originalName,
        sizeBytes: input.blob.size,
      };
      input.onStage?.('requesting');
      if (mode === 'mock') {
        input.onStage?.('uploading');
        input.onStage?.('confirming');
        return { fileId: 'preview-signature-file', storageKey: 'preview/signature' };
      }
      const upload = await request<RequestSignatureUploadResult>(
        fetcher,
        apiBaseUrl(),
        '/participation-access/signature/upload-url',
        {
          body: JSON.stringify(metadata),
          headers: mutationHeaders(input.csrfToken),
          method: 'POST',
        },
        200,
      );
      input.onStage?.('uploading');
      const storageResponse = await storageFetcher(upload.uploadUrl, {
        body: input.blob,
        credentials: 'omit',
        headers: { 'Content-Type': input.blob.type },
        method: 'PUT',
      });
      if (!storageResponse.ok) throw new Error('Signature storage upload failed');
      input.onStage?.('confirming');
      return request<ConfirmSignatureUploadResult>(
        fetcher,
        apiBaseUrl(),
        '/participation-access/signature/confirm',
        {
          body: JSON.stringify({ ...metadata, storageKey: upload.storageKey }),
          headers: mutationHeaders(input.csrfToken),
          method: 'POST',
        },
        201,
      );
    },
    async participate(input: {
      csrfToken: string;
      selectedCandidateId: string;
      voteDetailId: string;
    }) {
      if (mode === 'mock') return { id: crypto.randomUUID(), status: 'CAST' as const, voteDetailId: input.voteDetailId };
      return request<{ id: string; status: 'CAST'; voteDetailId: string }>(
        fetcher,
        apiBaseUrl(),
        '/participation-access/participations',
        {
          body: JSON.stringify({
            selectedCandidateId: input.selectedCandidateId,
            voteDetailId: input.voteDetailId,
          }),
          headers: mutationHeaders(input.csrfToken),
          method: 'POST',
        },
        201,
      );
    },
    async getResult(voteDetailId: string) {
      if (mode === 'mock') {
        const detail = mockSession.voteDetails?.find((item) => item.id === voteDetailId);
        return {
          candidates: (detail?.candidates ?? []).map((candidate, index) => ({
            candidateId: candidate.id,
            candidateNo: candidate.candidateNo,
            name: candidate.name,
            status: 'ACTIVE' as const,
            voteCount: index === 0 ? 82 : 38,
            voteRate: index === 0 ? 68.3 : 31.7,
            weightedVoteCount: index === 0 ? 82 : 38,
            weightedVoteRate: index === 0 ? 68.3 : 31.7,
          })),
          participantCount: 120,
          participatedVoteWeight: 120,
          participationUnit: 'INDIVIDUAL' as const,
          privacyMode: 'SECRET' as const,
          totalVoteCount: 120,
          totalWeightedVoteCount: 120,
          voteDetailId,
          voteWeightMode: 'EQUAL' as const,
          votingChannels: [],
        } satisfies ParticipationResult;
      }
      return request<ParticipationResult>(
        fetcher,
        apiBaseUrl(),
        `/participation-access/sub-votes/${encode(voteDetailId)}/results`,
      );
    },
  };
}

export const participationAccessApi = createParticipationAccessApiClient();
export const participationAccessPreviewApi = createParticipationAccessApiClient({ mode: 'mock' });
