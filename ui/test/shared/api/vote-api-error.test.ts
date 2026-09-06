import { describe, expect, it } from 'vitest';

import {
  toVoteApiError,
  VoteApiError,
} from '@/shared/api/vote-api-error';

describe('VoteApiError', () => {
  it('retains the HTTP status for boundary-specific error handling', async () => {
    const error = await toVoteApiError(
      new Response(
        JSON.stringify({ error: { message: 'invalid electoral roll' } }),
        { status: 400 },
      ),
    );

    expect(error).toBeInstanceOf(VoteApiError);
    expect(error).toMatchObject({
      message: 'invalid electoral roll',
      status: 400,
    });
  });
});
