export interface AuthRegistrationInput {
  email: string;
  name: string;
  password: string;
  phone: string;
  username: string;
}

type AuthRegistrationFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const DEFAULT_AUTH_ORIGIN = 'http://localhost:3002';
const DEFAULT_TENANT_CODE = 'acme';

export class AuthRegistrationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuthRegistrationError';
  }
}

function getAuthOrigin() {
  return (process.env.AUTH_OIDC_ISSUER ?? DEFAULT_AUTH_ORIGIN).replace(
    /\/+$/,
    '',
  );
}

function getTenantCode() {
  return process.env.AUTH_OIDC_TENANT_CODE ?? DEFAULT_TENANT_CODE;
}

function readErrorMessage(payload: unknown) {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const { message } = payload as { message?: unknown };

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }

    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === 'string')
    ) {
      return message.join(' ');
    }
  }

  return undefined;
}

async function getRegistrationError(response: Response) {
  const payload = await response.json().catch(() => undefined);
  const providerMessage = readErrorMessage(payload);

  if (response.status === 409) {
    return '이미 사용 중인 아이디, 이메일 또는 전화번호입니다.';
  }

  if (response.status >= 500) {
    return '인증 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도하세요.';
  }

  return providerMessage ?? '회원가입 요청을 처리하지 못했습니다.';
}

export async function registerAuthAccount(
  input: AuthRegistrationInput,
  fetcher: AuthRegistrationFetcher = fetch,
) {
  const response = await fetcher(`${getAuthOrigin()}/auth/signup`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tenant-code': getTenantCode(),
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      phone: input.phone,
      username: input.username,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new AuthRegistrationError(
      await getRegistrationError(response),
      response.status,
    );
  }

  const payload = (await response.json()) as { userId?: unknown };
  if (typeof payload.userId !== 'string' || !payload.userId) {
    throw new AuthRegistrationError('회원가입을 완료하지 못했습니다.', 502);
  }
  return { userId: payload.userId };
}

export async function registerVoteProfile(
  input: AuthRegistrationInput & { userPrincipalId: string },
  fetcher: AuthRegistrationFetcher = fetch,
) {
  const baseUrl = (
    process.env.VOTE_API_BASE_URL ?? 'http://localhost:3000'
  ).replace(/\/+$/, '');
  const secret = process.env.VOTE_PROFILE_REGISTRATION_SECRET;
  if (!secret) throw new Error('vote profile registration is not configured');
  const response = await fetcher(`${baseUrl}/internal/user-profiles`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-vote-registration-secret': secret,
    },
    body: JSON.stringify({
      tenantCode: getTenantCode(),
      userPrincipalId: input.userPrincipalId,
      name: input.name,
      email: input.email,
      phone: input.phone,
    }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('vote profile registration failed');
}
