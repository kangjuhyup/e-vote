import { notifyVoteApiAuthRequired } from '@/shared/auth/vote-api-auth-events';

export async function voteApiFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    notifyVoteApiAuthRequired();
  }

  return response;
}
