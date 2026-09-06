import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bootstrapAuthClient,
  createDesiredClient,
  createDesiredResourceServer,
  createDesiredScope,
} from './bootstrap-auth-client.mjs';

const env = {
  AUTH_BASE_URL: 'http://auth-service:3000',
  AUTH_ADMIN_USERNAME: 'admin',
  AUTH_ADMIN_PASSWORD: 'test-password',
};

function response(body, init = {}) {
  return new Response(body === undefined ? undefined : JSON.stringify(body), {
    status: init.status ?? 200,
    headers: init.headers,
  });
}

function loginResponse() {
  return response(
    { username: 'admin', passwordChangeRequired: false },
    {
      headers: [
        ['content-type', 'application/json'],
        ['set-cookie', 'admin_session=session-token; Path=/; HttpOnly'],
        ['set-cookie', 'admin_refresh=refresh-token; Path=/; HttpOnly'],
      ],
    },
  );
}

function existingScopeResponse() {
  return response({
    items: [{ id: 'scope-1', ...createDesiredScope(), builtIn: false }],
    total: 1,
    page: 1,
    limit: 100,
  });
}

test('creates the offline scope and both local OIDC clients', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith('/admin/session')) return loginResponse();
    if (url.includes('/admin/scopes?')) {
      return response({ items: [], total: 0, page: 1, limit: 100 });
    }
    if (url.endsWith('/admin/scopes')) {
      return response({ id: 'scope-1' }, { status: 201 });
    }
    if (url.includes('/admin/clients?')) {
      return response({ items: [], total: 0, page: 1, limit: 100 });
    }
    if (url.endsWith('/admin/clients')) {
      return response({ id: 'client-1' }, { status: 201 });
    }
    return response({ issuer: 'http://localhost:3002/t/acme/oidc' });
  };

  const result = await bootstrapAuthClient({ env, fetchImpl, log: () => {} });

  assert.equal(result, 'created');
  assert.equal(calls.length, 7);
  assert.deepEqual(JSON.parse(calls[2].options.body), createDesiredScope());
  assert.deepEqual(JSON.parse(calls[4].options.body), createDesiredClient(env));
  assert.deepEqual(
    JSON.parse(calls[5].options.body),
    createDesiredResourceServer(env),
  );
  assert.match(calls[4].options.headers.cookie, /admin_session=session-token/);
  assert.equal(
    createDesiredClient(env).scope,
    'openid profile email offline_access',
  );
  assert.deepEqual(createDesiredClient(env).allowedResources, [
    'https://vote-api.example.com',
  ]);
});

test('registers a confidential Vote API introspection client', () => {
  assert.deepEqual(createDesiredResourceServer(env), {
    clientId: 'vote-api',
    secret: 'vote-local-introspection-secret-change-me',
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
    introspectionResources: ['https://vote-api.example.com'],
  });
});

test('allows the Vote API resource identifier to be overridden', () => {
  assert.deepEqual(
    createDesiredClient({
      ...env,
      AUTH_CLIENT_ALLOWED_RESOURCE: 'https://api.example.com/vote/',
    }).allowedResources,
    ['https://api.example.com'],
  );
});

test('rejects a non-HTTPS Vote API resource', () => {
  assert.throws(
    () =>
      createDesiredClient({
        ...env,
        AUTH_CLIENT_ALLOWED_RESOURCE: 'http://api.example.com',
      }),
    /AUTH_CLIENT_ALLOWED_RESOURCE_INVALID/,
  );
});

test('is idempotent when the scope and clients already exist', async () => {
  const desiredClient = createDesiredClient(env);
  const desiredResourceServer = createDesiredResourceServer(env);
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith('/admin/session')) return loginResponse();
    if (url.includes('/admin/scopes?')) return existingScopeResponse();
    if (url.includes('/admin/clients?')) {
      return response({
        items: [
          { id: 'client-1', ...desiredClient, enabled: true },
          {
            id: 'client-2',
            ...desiredResourceServer,
            secret: undefined,
            enabled: true,
          },
        ],
        total: 2,
        page: 1,
        limit: 100,
      });
    }
    throw new Error(`unexpected request: ${url}`);
  };

  const result = await bootstrapAuthClient({ env, fetchImpl, log: () => {} });

  assert.equal(result, 'existing');
  assert.equal(calls.length, 3);
});

test('updates refresh scope and allowed resource on a legacy public client', async () => {
  const desiredClient = createDesiredClient(env);
  const desiredResourceServer = createDesiredResourceServer(env);
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.endsWith('/admin/session')) return loginResponse();
    if (url.includes('/admin/scopes?')) return existingScopeResponse();
    if (url.includes('/admin/clients?')) {
      return response({
        items: [
          {
            id: 'legacy/client',
            ...desiredClient,
            enabled: true,
            scope: 'openid profile email',
            allowedResources: [],
          },
          {
            id: 'client-2',
            ...desiredResourceServer,
            secret: undefined,
            enabled: true,
          },
        ],
        total: 2,
        page: 1,
        limit: 100,
      });
    }
    if (url.endsWith('/admin/clients/legacy%2Fclient')) {
      return response(undefined, { status: 204 });
    }
    return response({ issuer: 'http://localhost:3002/t/acme/oidc' });
  };

  const result = await bootstrapAuthClient({ env, fetchImpl, log: () => {} });

  assert.equal(result, 'created');
  assert.equal(calls.length, 5);
  assert.equal(calls[3].options.method, 'PUT');
  assert.deepEqual(JSON.parse(calls[3].options.body), {
    scope: 'openid profile email offline_access',
    allowedResources: ['https://vote-api.example.com'],
  });
});

test('fails closed when an existing client has incompatible settings', async () => {
  const desiredClient = createDesiredClient(env);
  const desiredResourceServer = createDesiredResourceServer(env);
  const fetchImpl = async (url) => {
    if (url.endsWith('/admin/session')) return loginResponse();
    if (url.includes('/admin/scopes?')) return existingScopeResponse();
    return response({
      items: [
        {
          id: 'client-1',
          ...desiredClient,
          enabled: true,
          redirectUris: ['http://unexpected.example/callback'],
        },
        { ...desiredResourceServer, secret: undefined, enabled: true },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
  };

  await assert.rejects(
    bootstrapAuthClient({ env, fetchImpl, log: () => {} }),
    /AUTH_CLIENT_CONFLICT/,
  );
});
