export const E_VOTE_PROVIDER_ID = "e-vote";
export const E_VOTE_CLIENT_ID = "e-vote";

const DEFAULT_OIDC_ISSUER_ORIGIN = "http://localhost:3000";
const DEFAULT_OIDC_TENANT_CODE = "acme";

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
  const normalizedOrigin = issuerOrigin.replace(/\/+$/, "");
  const encodedTenantCode = encodeURIComponent(tenantCode);

  return `${normalizedOrigin}/t/${encodedTenantCode}/oidc`;
}

export function getTenantOidcIssuer() {
  return buildTenantOidcIssuer({
    issuerOrigin: process.env.AUTH_OIDC_ISSUER ?? DEFAULT_OIDC_ISSUER_ORIGIN,
    tenantCode: process.env.AUTH_OIDC_TENANT_CODE ?? DEFAULT_OIDC_TENANT_CODE,
  });
}

export function mapEVoteProfileToUser(profile: EVoteOidcProfile) {
  return {
    id: profile.sub,
    name: profile.name ?? profile.email ?? profile.sub,
    email: profile.email ?? null,
    image: null,
  };
}
