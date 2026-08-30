import { getToken } from 'next-auth/jwt';

import { getVoteAccessToken } from '@/shared/auth/vote-session-token';

export const runtime = 'nodejs';

type VoteApiRouteContext = {
  readonly params: Promise<{
    readonly path: readonly string[];
  }>;
};

const FORWARDED_REQUEST_HEADER_BLOCKLIST = [
  'authorization',
  'connection',
  'content-length',
  'cookie',
  'host',
] as const;

const FORWARDED_RESPONSE_HEADER_BLOCKLIST = [
  'connection',
  'content-encoding',
  'content-length',
  'set-cookie',
  'transfer-encoding',
] as const;

function isSecureCookie(request: Request): boolean {
  const authUrl = process.env.AUTH_URL;
  return new URL(authUrl ?? request.url).protocol === 'https:';
}

function createSessionHeaders(request: Request): Headers {
  const headers = new Headers();
  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.set('cookie', cookie);
  }

  return headers;
}

function createUpstreamUrl(request: Request, path: readonly string[]): string {
  const baseUrl = (
    process.env.VOTE_API_BASE_URL ?? 'http://localhost:3000'
  ).replace(/\/+$/, '');
  const encodedPath = path.map(encodeURIComponent).join('/');
  const query = new URL(request.url).search;

  return `${baseUrl}/${encodedPath}${query}`;
}

async function resolveAccessToken(
  request: Request,
): Promise<string | undefined> {
  try {
    const token = await getToken({
      req: { headers: createSessionHeaders(request) },
      secret: process.env.AUTH_SECRET,
      secureCookie: isSecureCookie(request),
    });

    return getVoteAccessToken(token);
  } catch {
    return undefined;
  }
}

async function proxyVoteApiRequest(
  request: Request,
  context: VoteApiRouteContext,
): Promise<Response> {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) {
    return Response.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  }

  const headers = new Headers(request.headers);
  for (const header of FORWARDED_REQUEST_HEADER_BLOCKLIST) {
    headers.delete(header);
  }
  headers.set('authorization', `Bearer ${accessToken}`);

  const { path } = await context.params;
  const hasBody = !['GET', 'HEAD'].includes(request.method);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(createUpstreamUrl(request, path), {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
    });
  } catch {
    return Response.json(
      { message: '투표 서버에 연결하지 못했습니다.' },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const header of FORWARDED_RESPONSE_HEADER_BLOCKLIST) {
    responseHeaders.delete(header);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyVoteApiRequest;
export const POST = proxyVoteApiRequest;
export const PUT = proxyVoteApiRequest;
export const PATCH = proxyVoteApiRequest;
export const DELETE = proxyVoteApiRequest;
export const HEAD = proxyVoteApiRequest;
