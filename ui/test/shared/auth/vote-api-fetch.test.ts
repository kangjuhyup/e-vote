/* @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  VOTE_API_AUTH_REQUIRED_EVENT,
} from '@/shared/auth/vote-api-auth-events';
import { voteApiFetch } from '@/shared/auth/vote-api-fetch';

describe('voteApiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('notifies the session boundary when the Vote API returns 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({}, { status: 401 })),
    );
    const listener = vi.fn();
    window.addEventListener(VOTE_API_AUTH_REQUIRED_EVENT, listener);

    const response = await voteApiFetch('/api/vote-server/votes');

    expect(response.status).toBe(401);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(VOTE_API_AUTH_REQUIRED_EVENT, listener);
  });

  it('does not emit an auth event for non-authentication failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({}, { status: 500 })),
    );
    const listener = vi.fn();
    window.addEventListener(VOTE_API_AUTH_REQUIRED_EVENT, listener);

    await voteApiFetch('/api/vote-server/votes');

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(VOTE_API_AUTH_REQUIRED_EVENT, listener);
  });
});
