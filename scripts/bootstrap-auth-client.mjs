import { pathToFileURL } from "node:url";

const DEFAULT_BASE_URL = "http://auth-service:3000";
const DEFAULT_CLIENT_ID = "e-vote";
const DEFAULT_REDIRECT_URI =
  "http://localhost:3001/api/auth/callback/e-vote";
const DEFAULT_POST_LOGOUT_URI = "http://localhost:3001";

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
    name: "E-Vote",
    type: "public",
    redirectUris: [env.AUTH_CLIENT_REDIRECT_URI || DEFAULT_REDIRECT_URI],
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    tokenEndpointAuthMethod: "none",
    scope: "openid profile email",
    postLogoutRedirectUris: [
      env.AUTH_CLIENT_POST_LOGOUT_URI || DEFAULT_POST_LOGOUT_URI,
    ],
    applicationType: "web",
    skipConsent: true,
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
    sameValues(
      actual.postLogoutRedirectUris,
      expected.postLogoutRedirectUris,
    ) &&
    actual?.applicationType === expected.applicationType &&
    actual?.skipConsent === expected.skipConsent
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
    .map((cookie) => cookie.split(";", 1)[0])
    .filter(Boolean)
    .join("; ");

  if (!cookieHeader.includes("admin_session=")) {
    throw new Error("AUTH_ADMIN_SESSION_COOKIE_MISSING");
  }
  return cookieHeader;
}

async function requireOk(response, errorCode) {
  if (!response.ok) {
    throw new Error(`${errorCode}_${response.status}`);
  }
  return response;
}

export async function bootstrapAuthClient({
  env = process.env,
  fetchImpl = fetch,
  log = console.log,
} = {}) {
  const baseUrl = (env.AUTH_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const username = requireValue(env, "AUTH_ADMIN_USERNAME");
  const password = requireValue(env, "AUTH_ADMIN_PASSWORD");
  const desiredClient = createDesiredClient(env);

  const loginResponse = await requireOk(
    await fetchImpl(`${baseUrl}/admin/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    }),
    "AUTH_ADMIN_LOGIN_FAILED",
  );
  const cookieHeader = extractCookieHeader(loginResponse);

  const listResponse = await requireOk(
    await fetchImpl(`${baseUrl}/t/acme/admin/clients?limit=100`, {
      headers: { cookie: cookieHeader },
    }),
    "AUTH_CLIENT_LIST_FAILED",
  );
  const result = await listResponse.json();
  const existing = result.items?.find(
    (client) => client.clientId === desiredClient.clientId,
  );

  if (existing) {
    if (!isCompatibleClient(existing, desiredClient)) {
      throw new Error("AUTH_CLIENT_CONFLICT");
    }
    log("Auth client already configured");
    return "existing";
  }

  await requireOk(
    await fetchImpl(`${baseUrl}/t/acme/admin/clients`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader,
      },
      body: JSON.stringify(desiredClient),
    }),
    "AUTH_CLIENT_CREATE_FAILED",
  );

  await requireOk(
    await fetchImpl(
      `${baseUrl}/t/acme/oidc/.well-known/openid-configuration`,
    ),
    "AUTH_DISCOVERY_FAILED",
  );

  log("Auth client configured");
  return "created";
}

const isMain =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  bootstrapAuthClient().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "AUTH_CLIENT_BOOTSTRAP_FAILED",
    );
    process.exitCode = 1;
  });
}
