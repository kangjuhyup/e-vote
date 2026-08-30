type AuthenticationEnvironment = Readonly<Record<string, string | undefined>>;

type OidcAuthenticationConfigParams = {
  readonly issuer: string;
  readonly jwksUri: string;
  readonly audience: string;
  readonly tenantCode: string;
};

export const OIDC_AUTHENTICATION_CONFIG = Symbol('OIDC_AUTHENTICATION_CONFIG');

function requireNonEmpty(value: string | undefined, name: string): string {
  if (!value || value.trim().length === 0) {
    throw new TypeError(`${name} must not be empty`);
  }

  return value.trim();
}

function normalizeAbsoluteHttpUrl(value: string, name: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`${name} must be an absolute HTTP(S) URL`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new TypeError(`${name} must be an absolute HTTP(S) URL`);
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new TypeError(`${name} must not contain credentials, query, or hash`);
  }

  return url.toString().replace(/\/+$/, '');
}

export class OidcAuthenticationConfig {
  private constructor(
    readonly issuer: string,
    readonly jwksUri: string,
    readonly audience: string,
    readonly tenantCode: string,
  ) {}

  static of(params: OidcAuthenticationConfigParams): OidcAuthenticationConfig {
    return Object.freeze(
      new OidcAuthenticationConfig(
        normalizeAbsoluteHttpUrl(params.issuer, 'issuer'),
        normalizeAbsoluteHttpUrl(params.jwksUri, 'jwksUri'),
        requireNonEmpty(params.audience, 'audience'),
        requireNonEmpty(params.tenantCode, 'tenantCode'),
      ),
    );
  }

  static fromEnvironment(
    environment: AuthenticationEnvironment = process.env,
  ): OidcAuthenticationConfig {
    const tenantCode = requireNonEmpty(
      environment.AUTH_OIDC_TENANT_CODE ?? 'acme',
      'AUTH_OIDC_TENANT_CODE',
    );
    const issuer = environment.VOTE_AUTH_ISSUER
      ? normalizeAbsoluteHttpUrl(
          environment.VOTE_AUTH_ISSUER,
          'VOTE_AUTH_ISSUER',
        )
      : `${normalizeAbsoluteHttpUrl(
          environment.AUTH_OIDC_ISSUER ?? 'http://localhost:3002',
          'AUTH_OIDC_ISSUER',
        )}/t/${encodeURIComponent(tenantCode)}/oidc`;

    return OidcAuthenticationConfig.of({
      issuer,
      jwksUri:
        environment.VOTE_AUTH_JWKS_URI ?? `${issuer.replace(/\/+$/, '')}/jwks`,
      audience:
        environment.VOTE_AUTH_AUDIENCE ??
        environment.AUTH_E_VOTE_CLIENT_ID ??
        'e-vote',
      tenantCode,
    });
  }
}
