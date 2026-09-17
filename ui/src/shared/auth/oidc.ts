export const E_VOTE_PROVIDER_ID = 'e-vote';
export const E_VOTE_CLIENT_ID = 'e-vote';

const DEFAULT_OIDC_ISSUER_ORIGIN = 'http://localhost:3000';
const DEFAULT_OIDC_TENANT_CODE = 'e-vote';
const DEFAULT_VOTE_API_RESOURCE = 'https://vote-api.example.com';

export interface EVoteOidcProfile {
  sub: string;
  name?: string | null;
  email?: string | null;
}

type AuthEnvironment = Readonly<Record<string, string | undefined>>;

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
  return buildTenantOidcIssuer({
    issuerOrigin: environment.AUTH_OIDC_ISSUER ?? DEFAULT_OIDC_ISSUER_ORIGIN,
    tenantCode: environment.AUTH_OIDC_TENANT_CODE ?? DEFAULT_OIDC_TENANT_CODE,
  });
}

export function getVoteApiResource(environment: AuthEnvironment = process.env) {
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
  const clientSecret =
    environment.AUTH_E_VOTE_SECRET ?? environment.AUTH_E_VOTE_CLIENT_SECRET;
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
