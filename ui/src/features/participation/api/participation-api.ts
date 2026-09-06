import { toVoteApiError } from '@/shared/api/vote-api-error';
import { isApiMockMode } from '@/shared/config/api-mode';
import { unwrapVoteApiResponse } from '@/features/votes/api/votes-api';
import type {
  CastParticipationInput,
  ParticipationAccess,
} from '../model/participation.types';

let mockAccess: ParticipationAccess = {
  vote: {
    id: '11111111-1111-4111-8111-111111111111',
    title: '2026년 임원 선출 투표',
    description: '각 안건의 후보를 확인하고 한 명을 선택해 주세요.',
    status: 'OPEN',
    startedAt: '2026-09-05T00:00:00.000Z',
    endedAt: '2026-09-12T09:00:00.000Z',
    identityVerificationRequired: false,
  },
  elector: { label: '선거인 101', status: 'ELIGIBLE', identityVerified: false },
  expiresAt: '2026-09-12T09:00:00.000Z',
  ballots: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      title: '대표 선출',
      description: '대표 후보 중 한 명을 선택합니다.',
      type: 'CANDIDATE',
      status: 'OPEN',
      sortOrder: 1,
      participated: false,
      candidates: [
        { id: '33333333-3333-4333-8333-333333333333', candidateNo: 1, name: '김민준', description: '투명한 운영을 약속합니다.' },
        { id: '44444444-4444-4444-8444-444444444444', candidateNo: 2, name: '이지원', description: '참여 중심의 조직을 만들겠습니다.' },
      ],
    },
  ],
};

function baseUrl() {
  return process.env.NEXT_PUBLIC_PARTICIPATION_API_BASE_URL ?? '/api/participation-access';
}

async function request<T>(token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(baseUrl(), {
    ...init,
    headers: {
      Accept: 'application/json',
      'X-Participation-Token': token,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw await toVoteApiError(response);
  return unwrapVoteApiResponse<T>(await response.json());
}

export const participationApi = {
  async getAccess(token: string): Promise<ParticipationAccess> {
    if (isApiMockMode()) return structuredClone(mockAccess);
    return request<ParticipationAccess>(token);
  },
  async cast(input: CastParticipationInput): Promise<void> {
    if (isApiMockMode()) {
      mockAccess = {
        ...mockAccess,
        ballots: mockAccess.ballots.map((ballot) =>
          ballot.id === input.voteDetailId
            ? { ...ballot, participated: true }
            : ballot,
        ),
      };
      return;
    }
    await request(input.token, {
      method: 'POST',
      body: JSON.stringify({
        voteDetailId: input.voteDetailId,
        selectedCandidateId: input.selectedCandidateId,
      }),
    });
  },
};
