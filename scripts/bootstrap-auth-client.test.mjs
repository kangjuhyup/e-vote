import assert from "node:assert/strict";
import test from "node:test";

import {
  bootstrapAuthClient,
  createDesiredClient,
} from "./bootstrap-auth-client.mjs";

const env = {
  AUTH_BASE_URL: "http://auth-service:3000",
  AUTH_ADMIN_USERNAME: "admin",
  AUTH_ADMIN_PASSWORD: "test-password",
};

function response(body, init = {}) {
  return new Response(body === undefined ? undefined : JSON.stringify(body), {
    status: init.status ?? 200,
    headers: init.headers,
  });
}

function loginResponse() {
  return response(
    { username: "admin", passwordChangeRequired: false },
    {
      headers: [
        ["content-type", "application/json"],
        ["set-cookie", "admin_session=session-token; Path=/; HttpOnly"],
        ["set-cookie", "admin_refresh=refresh-token; Path=/; HttpOnly"],
      ],
    },
  );
}

test("creates the local public OIDC client through the admin API", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/admin/session")) return loginResponse();
    if (url.includes("/admin/clients?")) {
      return response({ items: [], total: 0, page: 1, limit: 100 });
    }
    if (url.endsWith("/admin/clients")) {
      return response({ id: "client-1" }, { status: 201 });
    }
    return response({ issuer: "http://localhost:3002/t/acme/oidc" });
  };

  const result = await bootstrapAuthClient({
    env,
    fetchImpl,
    log: () => {},
  });

  assert.equal(result, "created");
  assert.equal(calls.length, 4);
  assert.deepEqual(
    JSON.parse(calls[2].options.body),
    createDesiredClient(env),
  );
  assert.match(calls[2].options.headers.cookie, /admin_session=session-token/);
});

test("is idempotent when the compatible client already exists", async () => {
  const desiredClient = createDesiredClient(env);
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith("/admin/session")) return loginResponse();
    return response({
      items: [{ ...desiredClient, enabled: true }],
      total: 1,
      page: 1,
      limit: 100,
    });
  };

  const result = await bootstrapAuthClient({
    env,
    fetchImpl,
    log: () => {},
  });

  assert.equal(result, "existing");
  assert.equal(calls.length, 2);
});

test("fails closed when an existing client has incompatible settings", async () => {
  const desiredClient = createDesiredClient(env);
  const fetchImpl = async (url) => {
    if (url.endsWith("/admin/session")) return loginResponse();
    return response({
      items: [
        {
          ...desiredClient,
          enabled: true,
          redirectUris: ["http://unexpected.example/callback"],
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
    });
  };

  await assert.rejects(
    bootstrapAuthClient({ env, fetchImpl, log: () => {} }),
    /AUTH_CLIENT_CONFLICT/,
  );
});
