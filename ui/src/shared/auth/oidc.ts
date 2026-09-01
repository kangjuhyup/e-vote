export const E_VOTE_PROVIDER_ID = 'e-vote';
export const E_VOTE_CLIENT_ID = 'e-vote';

const DEFAULT_OIDC_ISSUER_ORIGIN = 'http://localhost:3000';
const DEFAULT_OIDC_TENANT_CODE = 'acme';
const DEFAULT_VOTE_API_RESOURCE = 'https://vote-api.example.com';

export interface EVoteOidcProfile {
  sub: string;
  name?: string | null;
  email?: string | null;
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

export function getTenantOidcIssuer() {
  return buildTenantOidcIssuer({
    issuerOrigin: process.env.AUTH_OIDC_ISSUER ?? DEFAULT_OIDC_ISSUER_ORIGIN,
    tenantCode: process.env.AUTH_OIDC_TENANT_CODE ?? DEFAULT_OIDC_TENANT_CODE,
  });
}

export function getVoteApiResource(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
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

export function mapEVoteProfileToUser(profile: EVoteOidcProfile) {
  return {
    id: profile.sub,
    name: profile.name ?? profile.email ?? profile.sub,
    email: profile.email ?? null,
    image: null,
  };
}
