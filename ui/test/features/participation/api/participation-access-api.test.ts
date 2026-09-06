import { describe, expect, it, vi } from 'vitest';

import {
  consumeParticipationAccessToken,
  createParticipationAccessApiClient,
  getParticipationAccessErrorMessage,
} from '@/features/participation/api/participation-access-api';
import { VoteApiError } from '@/shared/api/vote-api-error';

function envelope(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

const session = {
  csrfToken: 'csrf-secret',
  hasConfirmedSignature: false,
  permittedActions: { participate: true, readResults: false, uploadSignature: true },
  scope: 'PARTICIPATE' as const,
  sessionExpiresAt: 'server-only-field',
  voteId: 'server-only-field',
  vote: {
    description: '', endedAt: '2026-09-07', id: 'vote', startedAt: '2026-09-06', status: 'OPEN' as const, title: '대표 선출',
  },
  voteDetails: [],
};

describe('participation access API', () => {
  it('consumes the fragment once and immediately removes it without storing the token', () => {
    const replaceState = vi.fn();
    const token = consumeParticipationAccessToken(
      { hash: '#access_token=signed%3Avalue', pathname: '/participate', search: '?mock=false' } as Location,
      { replaceState, state: { navigation: true } } as unknown as History,
    );
    expect(token).toBe('signed:value');
    expect(replaceState).toHaveBeenCalledWith({ navigation: true }, '', '/participate?mock=false');
  });

  it('exchanges with cookies and keeps only the allowed restoration fields', async () => {
    const fetcher = vi.fn().mockResolvedValue(envelope(session));
    const client = createParticipationAccessApiClient({ baseUrl: 'https://api.example', fetcher, mode: 'live' });
    const restored = await client.exchange('one-use-token');
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example/participation-access/exchange',
      expect.objectContaining({
        body: JSON.stringify({ token: 'one-use-token' }),
        cache: 'no-store',
        credentials: 'include',
        method: 'POST',
      }),
    );
    expect(restored).not.toHaveProperty('voteId');
    expect(restored).not.toHaveProperty('sessionExpiresAt');
  });

  it('uploads the same blob, confirms, then sends only the ballot selection with CSRF', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(envelope({ storageKey: 'signatures/key', uploadUrl: 'https://storage.example/key', expiresAt: '2026-09-07' }))
      .mockResolvedValueOnce(envelope({ fileId: 'file', storageKey: 'signatures/key' }, 201))
      .mockResolvedValueOnce(envelope({ id: 'participation', status: 'CAST', voteDetailId: 'detail' }, 201));
    const storageFetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const client = createParticipationAccessApiClient({ baseUrl: 'https://api.example', fetcher, mode: 'live', storageFetcher });
    const blob = new Blob(['ink'], { type: 'image/png' });
    await client.uploadSignature({ blob, csrfToken: 'csrf-secret', originalName: 'signature.png' });
    await client.participate({ csrfToken: 'csrf-secret', selectedCandidateId: 'candidate', voteDetailId: 'detail' });

    expect(storageFetcher.mock.calls[0][1].body).toBe(blob);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      'https://api.example/participation-access/signature/upload-url',
      'https://api.example/participation-access/signature/confirm',
      'https://api.example/participation-access/participations',
    ]);
    const participationInit = fetcher.mock.calls[2][1] as RequestInit;
    expect(JSON.parse(String(participationInit.body))).toEqual({
      selectedCandidateId: 'candidate',
      voteDetailId: 'detail',
    });
    expect(participationInit.headers).toMatchObject({ 'x-csrf-token': 'csrf-secret' });
  });

  it.each([
    [401, '폐기'], [403, '보안'], [409, '재발급'], [429, '너무 많'], [503, '일시적'],
  ])('maps status %i to an actionable message', (status, expectedText) => {
    expect(getParticipationAccessErrorMessage(new VoteApiError('server detail', status))).toContain(expectedText);
  });
});
