export const E_VOTE_PROVIDER_ID = 'e-vote';
export const E_VOTE_CLIENT_ID = 'e-vote';

const DEFAULT_OIDC_ISSUER_ORIGIN = 'http://localhost:3000';
const DEFAULT_OIDC_TENANT_CODE = 'e-vote';
const DEFAULT_VOTE_API_RESOURCE = 'https://vote-api.example.com';
const PRODUCTION_OIDC_ORIGIN = 'https://auth.rvkang.app';
const PRODUCTION_VOTE_API_ORIGIN = 'https://vote-api.rvkang.app';
const PRODUCTION_WEB_ORIGINS = new Set([
  'https://vote.rvkang.app',
  'https://vote-admin.rvkang.app',
]);

export interface EVoteOidcProfile {
  sub: string;
  name?: string | null;
  email?: string | null;
}

type AuthEnvironment = Readonly<Record<string, string | undefined>>;

function isProduction(environment: AuthEnvironment): boolean {
  return environment.NODE_ENV === 'production';
}

function requireProductionOrigin(value: string | undefined, name: string): string {
  if (!value) throw new TypeError(`${name} is required in production`);
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.example.com')
  ) {
    throw new TypeError(`${name} must be a production HTTPS origin`);
  }
  return url.origin;
}

export function getVoteWebOrigin(environment: AuthEnvironment = process.env): string {
  if (isProduction(environment)) {
    const origin = requireProductionOrigin(environment.AUTH_URL, 'AUTH_URL');
    if (!PRODUCTION_WEB_ORIGINS.has(origin)) {
      throw new TypeError('AUTH_URL must match an approved Vote web origin');
    }
    return origin;
  }
  return new URL(environment.AUTH_URL ?? 'http://localhost:3001').origin;
}

export function getEVoteClientSecret(
  environment: AuthEnvironment = process.env,
): string | undefined {
  const secret =
    environment.AUTH_E_VOTE_SECRET ?? environment.AUTH_E_VOTE_CLIENT_SECRET;
  if (isProduction(environment) && !secret?.trim()) {
    throw new TypeError('AUTH_E_VOTE_SECRET is required in production');
  }
  return secret;
}

interface BuildTenantOidcIssuerInput {
  issuerOrigin: string;
  tenantCode: string;
}

export function buildTenantOidcIssuer({
  issuerOrigin,
  tenantCode,
}: BuildTenantOidcIssuerInput) {
  const normalizedOrigin = issuerOrigin.replace(/\/+$/, '');
  const encodedTenantCode = encodeURIComponent(tenantCode);

  return `${normalizedOrigin}/t/${encodedTenantCode}/oidc`;
}

export function getTenantOidcIssuer(
  environment: AuthEnvironment = process.env,
) {
  if (isProduction(environment)) {
    const origin = requireProductionOrigin(
      environment.AUTH_OIDC_ISSUER,
      'AUTH_OIDC_ISSUER',
    );
    if (origin !== PRODUCTION_OIDC_ORIGIN) {
      throw new TypeError('AUTH_OIDC_ISSUER must match the e-vote Auth origin');
    }
    if (environment.AUTH_OIDC_TENANT_CODE !== 'e-vote') {
      throw new TypeError('AUTH_OIDC_TENANT_CODE must be e-vote in production');
    }
  }
  return buildTenantOidcIssuer({
    issuerOrigin: environment.AUTH_OIDC_ISSUER ?? DEFAULT_OIDC_ISSUER_ORIGIN,
    tenantCode: environment.AUTH_OIDC_TENANT_CODE ?? DEFAULT_OIDC_TENANT_CODE,
  });
}

export function getVoteApiResource(environment: AuthEnvironment = process.env) {
  if (isProduction(environment)) {
    const resource = requireProductionOrigin(
      environment.AUTH_E_VOTE_RESOURCE,
      'AUTH_E_VOTE_RESOURCE',
    );
    if (resource !== PRODUCTION_VOTE_API_ORIGIN) {
      throw new TypeError('AUTH_E_VOTE_RESOURCE must match the Vote API origin');
    }
    if (
      environment.VOTE_AUTH_AUDIENCE &&
      resource !==
        requireProductionOrigin(environment.VOTE_AUTH_AUDIENCE, 'VOTE_AUTH_AUDIENCE')
    ) {
      throw new TypeError('AUTH_E_VOTE_RESOURCE must match VOTE_AUTH_AUDIENCE');
    }
    return resource;
  }
  const resource =
    environment.AUTH_E_VOTE_RESOURCE?.trim() || DEFAULT_VOTE_API_RESOURCE;

  let resourceUrl: URL;
  try {
    resourceUrl = new URL(resource);
  } catch {
    throw new TypeError('AUTH_E_VOTE_RESOURCE must be an HTTPS origin');
  }

  if (
    resourceUrl.protocol !== 'https:' ||
    resourceUrl.username ||
    resourceUrl.password
  ) {
    throw new TypeError('AUTH_E_VOTE_RESOURCE must be an HTTPS origin');
  }

  return resourceUrl.origin;
}

export function createEVoteOidcProvider(
  environment: AuthEnvironment = process.env,
) {
  if (isProduction(environment) && !environment.AUTH_SECRET?.trim()) {
    throw new TypeError('AUTH_SECRET is required in production');
  }
  getVoteWebOrigin(environment);
  const clientSecret = getEVoteClientSecret(environment);
  const checks: Array<'pkce' | 'state' | 'nonce'> = ['pkce', 'state', 'nonce'];

  return {
    id: E_VOTE_PROVIDER_ID,
    name: 'E-Vote',
    type: 'oidc' as const,
    issuer: getTenantOidcIssuer(environment),
    idToken: true,
    clientId: E_VOTE_CLIENT_ID,
    ...(clientSecret ? { clientSecret } : {}),
    authorization: {
      params: {
        prompt: 'consent',
        scope: 'openid profile email offline_access groups tenant_roles',
        resource: getVoteApiResource(environment),
      },
    },
    checks,
    client: {
      token_endpoint_auth_method: clientSecret ? 'client_secret_basic' : 'none',
    },
    profile(profile: EVoteOidcProfile) {
      return mapEVoteProfileToUser(profile);
    },
  };
}

export function mapEVoteProfileToUser(profile: EVoteOidcProfile) {
  return {
    id: profile.sub,
    name: profile.name ?? profile.email ?? profile.sub,
    email: profile.email ?? null,
    image: null,
  };
}
