import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getTokenMock = vi.hoisted(() => vi.fn());

vi.mock('next-auth/jwt', () => ({
  getToken: getTokenMock,
}));

import { GET, POST } from '@/app/api/vote-server/[...path]/route';

describe('/api/vote-server authenticated proxy', () => {
  beforeEach(() => {
    getTokenMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('forwards a verified session access token as a Bearer token', async () => {
    vi.stubEnv('AUTH_SECRET', 'test-auth-secret');
    vi.stubEnv('VOTE_API_BASE_URL', 'http://localhost:3100/');
    getTokenMock.mockResolvedValue({
      voteAccessToken: 'oidc-access-token',
      voteAccessTokenExpiresAt: 1_900_000_000,
    });
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ items: [] }, { status: 200 }));
    vi.stubGlobal('fetch', fetcher);

    const response = await GET(
      new Request('http://localhost/api/vote-server/electoral-rolls?page=1', {
        headers: { cookie: 'authjs.session-token=encrypted' },
      }),
      { params: Promise.resolve({ path: ['electoral-rolls'] }) },
    );

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledOnce();
    const [destination, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(destination).toBe('http://localhost:3100/electoral-rolls?page=1');
    expect(new Headers(init.headers).get('authorization')).toBe(
      'Bearer oidc-access-token',
    );
    expect(init.cache).toBe('no-store');
    expect(new Headers(init.headers).has('cookie')).toBe(false);
  });

  it('forwards request bodies without forwarding browser credentials', async () => {
    vi.stubEnv('AUTH_SECRET', 'test-auth-secret');
    getTokenMock.mockResolvedValue({ voteAccessToken: 'oidc-access-token' });
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ id: 'vote-1' }, { status: 201 }));
    vi.stubGlobal('fetch', fetcher);

    const response = await POST(
      new Request('http://localhost/api/vote-server/votes', {
        method: 'POST',
        headers: {
          authorization: 'Bearer browser-controlled-token',
          cookie: 'authjs.session-token=encrypted',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: '2026 vote' }),
      }),
      { params: Promise.resolve({ path: ['votes'] }) },
    );

    expect(response.status).toBe(201);
    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('authorization')).toBe(
      'Bearer oidc-access-token',
    );
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe(
      JSON.stringify({ name: '2026 vote' }),
    );
  });

  it('returns 401 without exposing or forwarding a missing session token', async () => {
    vi.stubEnv('AUTH_SECRET', 'test-auth-secret');
    getTokenMock.mockResolvedValue(null);
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);

    const response = await GET(
      new Request('http://localhost/api/vote-server/votes'),
      { params: Promise.resolve({ path: ['votes'] }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: '로그인이 필요합니다.',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
