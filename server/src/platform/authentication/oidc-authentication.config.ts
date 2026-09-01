type AuthenticationEnvironment = Readonly<Record<string, string | undefined>>;

type OidcAuthenticationConfigParams = {
  readonly issuer: string;
  readonly introspectionUri: string;
  readonly audience: string;
  readonly tenantCode: string;
  readonly introspectionClientId: string;
  readonly introspectionClientSecret: string | undefined;
  readonly timeoutMs: number;
};

export const OIDC_AUTHENTICATION_CONFIG = Symbol('OIDC_AUTHENTICATION_CONFIG');

function requireNonEmpty(value: string | undefined, name: string): string {
  if (!value || value.trim().length === 0) {
    throw new TypeError(`${name} must not be empty`);
  }

  return value.trim();
}

function requireSecret(value: string | undefined, name: string): string {
  if (!value || value.trim().length === 0) {
    throw new TypeError(`${name} must not be empty`);
  }

  return value;
}

function requirePositiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer`);
  }

  return value;
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

function normalizeHttpsOrigin(value: string, name: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new TypeError(`${name} must be an absolute HTTPS origin`);
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new TypeError(`${name} must be an absolute HTTPS origin`);
  }

  return url.origin;
}

export class OidcAuthenticationConfig {
  private constructor(
    readonly issuer: string,
    readonly introspectionUri: string,
    readonly audience: string,
    readonly tenantCode: string,
    readonly introspectionClientId: string,
    readonly introspectionClientSecret: string,
    readonly timeoutMs: number,
  ) {}

  static of(params: OidcAuthenticationConfigParams): OidcAuthenticationConfig {
    return Object.freeze(
      new OidcAuthenticationConfig(
        normalizeAbsoluteHttpUrl(params.issuer, 'issuer'),
        normalizeAbsoluteHttpUrl(params.introspectionUri, 'introspectionUri'),
        normalizeHttpsOrigin(params.audience, 'audience'),
        requireNonEmpty(params.tenantCode, 'tenantCode'),
        requireNonEmpty(params.introspectionClientId, 'introspectionClientId'),
        requireSecret(
          params.introspectionClientSecret,
          'introspectionClientSecret',
        ),
        requirePositiveInteger(params.timeoutMs, 'timeoutMs'),
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
      introspectionUri:
        environment.VOTE_AUTH_INTROSPECTION_URI ??
        `${issuer.replace(/\/+$/, '')}/token/introspection`,
      audience:
        environment.VOTE_AUTH_AUDIENCE ?? 'https://vote-api.example.com',
      tenantCode,
      introspectionClientId:
        environment.VOTE_AUTH_INTROSPECTION_CLIENT_ID ?? 'vote-api',
      introspectionClientSecret:
        environment.VOTE_AUTH_INTROSPECTION_CLIENT_SECRET,
      timeoutMs: environment.VOTE_AUTH_INTROSPECTION_TIMEOUT_MS
        ? Number(environment.VOTE_AUTH_INTROSPECTION_TIMEOUT_MS)
        : 3_000,
    });
  }
}
