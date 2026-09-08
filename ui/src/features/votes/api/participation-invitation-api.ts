import { isApiMockMode } from '@/shared/config/api-mode';
import { voteApiFetch } from '@/shared/auth/vote-api-fetch';
import { toVoteApiError } from '@/shared/api/vote-api-error';

import type {
  DispatchParticipationInvitationsInput,
  ParticipationInvitationDevelopmentLink,
  ParticipationInvitationDispatchResult,
  ReissueParticipationInvitationInput,
} from '../model/participation-invitation.types';
import { unwrapVoteApiResponse } from './votes-api';

type ApiFetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface ClientOptions {
  baseUrl?: string;
  fetcher?: ApiFetcher;
  mode?: 'live' | 'mock';
}

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

export function createParticipationInvitationApiClient(options: ClientOptions = {}) {
  const mode = options.mode ?? (isApiMockMode() ? 'mock' : 'live');
  const baseUrl = (options.baseUrl ?? resolveBaseUrl()).replace(/\/+$/, '');
  const fetcher = options.fetcher ?? voteApiFetch;

  async function post(path: string, body?: object) {
    if (!baseUrl) throw new Error('NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode');
    const response = await fetcher(`${baseUrl}${path}`, {
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      method: 'POST',
    });
    if (!response.ok) throw await toVoteApiError(response);
    return unwrapVoteApiResponse<ParticipationInvitationDispatchResult>(await response.json());
  }

  async function getDevelopmentLink(
    input: ReissueParticipationInvitationInput,
  ) {
    if (mode === 'mock') {
      return {
        electorId: input.electorId,
        participationUrl: `http://localhost:3001/participate#access_token=mock-${encode(input.voteId)}-${encode(input.electorId)}`,
      } satisfies ParticipationInvitationDevelopmentLink;
    }
    if (!baseUrl) throw new Error('NEXT_PUBLIC_VOTE_API_BASE_URL is required in live mode');
    const response = await fetcher(
      `${baseUrl}/votes/${encode(input.voteId)}/electors/${encode(input.electorId)}/development-participation-link`,
      {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        method: 'GET',
      },
    );
    if (!response.ok) throw await toVoteApiError(response);
    return unwrapVoteApiResponse<ParticipationInvitationDevelopmentLink>(await response.json());
  }

  return {
    async dispatch(input: DispatchParticipationInvitationsInput) {
      if (mode === 'mock') {
        const totalCount = input.electorIds?.length ?? 2;
        return { queuedCount: totalCount, skippedCount: 0, totalCount };
      }
      return post(
        `/votes/${encode(input.voteId)}/participation-invitation-dispatches`,
        input.electorIds ? { electorIds: input.electorIds } : {},
      );
    },
    async reissue(input: ReissueParticipationInvitationInput) {
      if (mode === 'mock') return { queuedCount: 1, skippedCount: 0, totalCount: 1 };
      return post(`/votes/${encode(input.voteId)}/electors/${encode(input.electorId)}/participation-invitation/reissue`);
    },
    getDevelopmentLink,
  };
}

export const participationInvitationApi = createParticipationInvitationApiClient();
