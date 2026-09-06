export const runtime = 'nodejs';

const TOKEN_HEADER = 'x-participation-token';

function upstreamUrl(request: Request): string {
  const baseUrl = (process.env.VOTE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return request.method === 'POST'
    ? `${baseUrl}/participation-access/participations`
    : `${baseUrl}/participation-access`;
}

async function proxy(request: Request): Promise<Response> {
  const token = request.headers.get(TOKEN_HEADER);
  if (!token) {
    return Response.json({ message: '참여 링크가 필요합니다.' }, { status: 401 });
  }
  const headers = new Headers({ Accept: 'application/json', [TOKEN_HEADER]: token });
  const hasBody = request.method === 'POST';
  if (hasBody) headers.set('Content-Type', 'application/json');
  try {
    const upstream = await fetch(upstreamUrl(request), {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of ['connection', 'content-encoding', 'content-length', 'set-cookie', 'transfer-encoding']) {
      responseHeaders.delete(name);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ message: '투표 서버에 연결하지 못했습니다.' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
