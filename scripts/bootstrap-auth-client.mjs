import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'http://auth-service:3000';
const DEFAULT_CLIENT_ID = 'e-vote';
const DEFAULT_REDIRECT_URI = 'http://localhost:3001/api/auth/callback/e-vote';
const DEFAULT_POST_LOGOUT_URI = 'http://localhost:3001';
const DEFAULT_ALLOWED_RESOURCE = 'https://vote-api.example.com';
const DEFAULT_RESOURCE_SERVER_CLIENT_ID = 'vote-api';
const DEFAULT_RESOURCE_SERVER_SECRET =
  'vote-local-introspection-secret-change-me';
const TENANT_CODE = 'acme';

function normalizeAllowedResource(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('AUTH_CLIENT_ALLOWED_RESOURCE_INVALID');
  }

  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('AUTH_CLIENT_ALLOWED_RESOURCE_INVALID');
  }

  return url.origin;
}
function sameValues(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

export function createDesiredClient(env = process.env) {
  return {
    clientId: env.AUTH_CLIENT_ID || DEFAULT_CLIENT_ID,
    name: 'E-Vote',
    type: 'public',
    redirectUris: [env.AUTH_CLIENT_REDIRECT_URI || DEFAULT_REDIRECT_URI],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    tokenEndpointAuthMethod: 'none',
    scope: 'openid profile email offline_access groups tenant_roles',
    postLogoutRedirectUris: [
      env.AUTH_CLIENT_POST_LOGOUT_URI || DEFAULT_POST_LOGOUT_URI,
    ],
    applicationType: 'web',
    skipConsent: true,
    allowedResources: [
      normalizeAllowedResource(
        env.AUTH_CLIENT_ALLOWED_RESOURCE || DEFAULT_ALLOWED_RESOURCE,
      ),
    ],
  };
}

export function createDesiredResourceServer(env = process.env) {
  const audience = normalizeAllowedResource(
    env.AUTH_CLIENT_ALLOWED_RESOURCE || DEFAULT_ALLOWED_RESOURCE,
  );

  return {
    clientId:
      env.AUTH_RESOURCE_SERVER_CLIENT_ID || DEFAULT_RESOURCE_SERVER_CLIENT_ID,
    secret:
      env.AUTH_RESOURCE_SERVER_CLIENT_SECRET || DEFAULT_RESOURCE_SERVER_SECRET,
    name: 'Vote API',
    type: 'service',
    redirectUris: [],
    grantTypes: ['client_credentials'],
    responseTypes: [],
    tokenEndpointAuthMethod: 'client_secret_basic',
    scope: 'openid',
    postLogoutRedirectUris: [],
    applicationType: 'web',
    skipConsent: true,
    allowedResources: [],
    introspectionResources: [audience],
  };
}

export function createDesiredScope(name = 'offline_access') {
  const metadata = {
    offline_access: {
      displayName: 'Offline Access',
      description: 'Allows the e-vote client to renew expired access tokens.',
    },
    groups: {
      displayName: 'Groups',
      description:
        'Includes direct group authorization context in access tokens and introspection.',
    },
    tenant_roles: {
      displayName: 'Tenant Roles',
      description:
        'Includes tenant-wide role context in access tokens and introspection.',
    },
  }[name];
  if (!metadata) throw new Error('AUTH_SCOPE_NAME_INVALID');

  return {
    name,
    ...metadata,
    claimKeys: [],
    enabled: true,
  };
}

export function isCompatibleClient(actual, expected) {
  return (
    actual?.clientId === expected.clientId &&
    actual?.name === expected.name &&
    actual?.type === expected.type &&
    actual?.enabled === true &&
    sameValues(actual.redirectUris, expected.redirectUris) &&
    sameValues(actual.grantTypes, expected.grantTypes) &&
    sameValues(actual.responseTypes, expected.responseTypes) &&
    actual?.tokenEndpointAuthMethod === expected.tokenEndpointAuthMethod &&
    actual?.scope === expected.scope &&
    sameValues(actual.allowedResources, expected.allowedResources) &&
    sameValues(
      actual.postLogoutRedirectUris,
      expected.postLogoutRedirectUris,
    ) &&
    actual?.applicationType === expected.applicationType &&
    actual?.skipConsent === expected.skipConsent &&
    sameValues(
      actual.introspectionResources ?? [],
      expected.introspectionResources ?? [],
    )
  );
}

function canUpdatePublicClient(actual, expected) {
  return (
    expected.type === 'public' &&
    typeof actual?.id === 'string' &&
    actual.id.length > 0 &&
    isCompatibleClient(
      {
        ...actual,
        scope: expected.scope,
        allowedResources: expected.allowedResources,
      },
      expected,
    )
  );
}

function requireValue(env, key) {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key}_REQUIRED`);
  }
  return value;
}

function extractCookieHeader(response) {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  const cookieHeader = setCookies
    .map((cookie) => cookie.split(';', 1)[0])
    .filter(Boolean)
    .join('; ');

  if (!cookieHeader.includes('admin_session=')) {
    throw new Error('AUTH_ADMIN_SESSION_COOKIE_MISSING');
  }
  return cookieHeader;
}

async function requireOk(response, errorCode) {
  if (!response.ok) {
    throw new Error(`${errorCode}_${response.status}`);
  }
  return response;
}

async function ensureScope({ baseUrl, cookieHeader, fetchImpl, name }) {
  const listResponse = await requireOk(
    await fetchImpl(`${baseUrl}/t/${TENANT_CODE}/admin/scopes?limit=100`, {
      headers: { cookie: cookieHeader },
    }),
    'AUTH_SCOPE_LIST_FAILED',
  );
  const result = await listResponse.json();
  const existing = result.items?.find(
    (scope) => scope.name === name && scope.enabled === true,
  );

  if (existing) return 'existing';

  await requireOk(
    await fetchImpl(`${baseUrl}/t/${TENANT_CODE}/admin/scopes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify(createDesiredScope(name)),
    }),
    'AUTH_SCOPE_CREATE_FAILED',
  );

  return 'created';
}

export async function bootstrapAuthClient({
  env = process.env,
  fetchImpl = fetch,
  log = console.log,
} = {}) {
  const baseUrl = (env.AUTH_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const username = requireValue(env, 'AUTH_ADMIN_USERNAME');
  const password = requireValue(env, 'AUTH_ADMIN_PASSWORD');
  const desiredClients = [
    createDesiredClient(env),
    createDesiredResourceServer(env),
  ];

  const loginResponse = await requireOk(
    await fetchImpl(`${baseUrl}/admin/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
    'AUTH_ADMIN_LOGIN_FAILED',
  );
  const cookieHeader = extractCookieHeader(loginResponse);

  await ensureScope({
    baseUrl,
    cookieHeader,
    fetchImpl,
    name: 'offline_access',
  });
  await ensureScope({ baseUrl, cookieHeader, fetchImpl, name: 'groups' });
  await ensureScope({
    baseUrl,
    cookieHeader,
    fetchImpl,
    name: 'tenant_roles',
  });

  const listResponse = await requireOk(
    await fetchImpl(`${baseUrl}/t/${TENANT_CODE}/admin/clients?limit=100`, {
      headers: { cookie: cookieHeader },
    }),
    'AUTH_CLIENT_LIST_FAILED',
  );
  const result = await listResponse.json();
  let created = false;
  for (const desiredClient of desiredClients) {
    const existing = result.items?.find(
      (client) => client.clientId === desiredClient.clientId,
    );

    if (existing) {
      if (!isCompatibleClient(existing, desiredClient)) {
        if (canUpdatePublicClient(existing, desiredClient)) {
          await requireOk(
            await fetchImpl(
              `${baseUrl}/t/${TENANT_CODE}/admin/clients/${encodeURIComponent(existing.id)}`,
              {
                method: 'PUT',
                headers: {
                  'content-type': 'application/json',
                  cookie: cookieHeader,
                },
                body: JSON.stringify({
                  scope: desiredClient.scope,
                  allowedResources: desiredClient.allowedResources,
                }),
              },
            ),
            'AUTH_CLIENT_UPDATE_FAILED',
          );
          created = true;
          continue;
        }
        throw new Error('AUTH_CLIENT_CONFLICT');
      }
      continue;
    }

    await requireOk(
      await fetchImpl(`${baseUrl}/t/${TENANT_CODE}/admin/clients`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: cookieHeader,
        },
        body: JSON.stringify(desiredClient),
      }),
      'AUTH_CLIENT_CREATE_FAILED',
    );
    created = true;
  }

  if (!created) {
    log('Auth clients already configured');
    return 'existing';
  }

  await requireOk(
    await fetchImpl(
      `${baseUrl}/t/${TENANT_CODE}/oidc/.well-known/openid-configuration`,
    ),
    'AUTH_DISCOVERY_FAILED',
  );

  log('Auth clients configured');
  return 'created';
}

const isMain =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  bootstrapAuthClient().catch((error) => {
    console.error(
      error instanceof Error ? error.message : 'AUTH_CLIENT_BOOTSTRAP_FAILED',
    );
    process.exitCode = 1;
  });
}
