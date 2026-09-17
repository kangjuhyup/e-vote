type AuthenticationEnvironment = Readonly<Record<string, string | undefined>>;
const PRODUCTION_AUTH_ORIGIN = 'https://auth.rvkang.app';
const PRODUCTION_VOTE_API_ORIGIN = 'https://vote-api.rvkang.app';

type OidcAuthenticationConfigParams = {
  readonly issuer: string;
  readonly introspectionUri: string;
  readonly audience: string;
  readonly tenantCode: string;
  readonly tenantId?: string;
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
    readonly tenantId: string | undefined,
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
        params.tenantId === undefined
          ? undefined
          : requireNonEmpty(params.tenantId, 'tenantId'),
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
    const production = environment.NODE_ENV === 'production';
    const tenantCode = requireNonEmpty(
      environment.AUTH_OIDC_TENANT_CODE ?? 'e-vote',
      'AUTH_OIDC_TENANT_CODE',
    );
    if (production) {
      if (environment.AUTH_OIDC_TENANT_CODE !== 'e-vote') {
        throw new TypeError(
          'AUTH_OIDC_TENANT_CODE must be e-vote in production',
        );
      }
      if (environment.AUTH_OIDC_ISSUER !== PRODUCTION_AUTH_ORIGIN) {
        throw new TypeError(
          'AUTH_OIDC_ISSUER must match the production Auth origin',
        );
      }
      if (!environment.VOTE_AUTH_AUDIENCE) {
        throw new TypeError('VOTE_AUTH_AUDIENCE is required in production');
      }
      if (!environment.VOTE_AUTH_TENANT_ID?.trim()) {
        throw new TypeError('VOTE_AUTH_TENANT_ID is required in production');
      }
    }
    const issuer = environment.VOTE_AUTH_ISSUER
      ? normalizeAbsoluteHttpUrl(
          environment.VOTE_AUTH_ISSUER,
          'VOTE_AUTH_ISSUER',
        )
      : `${normalizeAbsoluteHttpUrl(
          environment.AUTH_OIDC_ISSUER ?? 'http://localhost:3002',
          'AUTH_OIDC_ISSUER',
        )}/t/${encodeURIComponent(tenantCode)}/oidc`;

    if (production && issuer !== `${PRODUCTION_AUTH_ORIGIN}/t/e-vote/oidc`) {
      throw new TypeError('VOTE_AUTH_ISSUER must match the e-vote issuer');
    }
    const introspectionUri =
      environment.VOTE_AUTH_INTROSPECTION_URI ??
      `${issuer.replace(/\/+$/, '')}/token/introspection`;
    if (production && introspectionUri !== `${issuer}/token/introspection`) {
      throw new TypeError(
        'VOTE_AUTH_INTROSPECTION_URI must match the e-vote issuer',
      );
    }
    const audience =
      environment.VOTE_AUTH_AUDIENCE ?? 'https://vote-api.example.com';
    if (production) {
      const audienceUrl = new URL(audience);
      if (
        audienceUrl.hostname === 'localhost' ||
        audienceUrl.hostname.endsWith('.example.com') ||
        audienceUrl.pathname !== '/' ||
        audienceUrl.search ||
        audienceUrl.hash
      ) {
        throw new TypeError(
          'VOTE_AUTH_AUDIENCE must be a production API origin',
        );
      }
      if (audienceUrl.origin !== PRODUCTION_VOTE_API_ORIGIN) {
        throw new TypeError(
          'VOTE_AUTH_AUDIENCE must match the Vote API origin',
        );
      }
      if (
        environment.VOTE_AUTH_INTROSPECTION_CLIENT_ID &&
        environment.VOTE_AUTH_INTROSPECTION_CLIENT_ID !== 'vote-api'
      ) {
        throw new TypeError(
          'VOTE_AUTH_INTROSPECTION_CLIENT_ID must be vote-api',
        );
      }
    }

    return OidcAuthenticationConfig.of({
      issuer,
      introspectionUri,
      audience,
      tenantCode,
      tenantId: environment.VOTE_AUTH_TENANT_ID,
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
