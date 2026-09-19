import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';

import {
  AUTHZ_ASSERTION_HEADER,
  InvalidAccessTokenError,
  type AccessTokenVerifierPort,
} from '../../shared/application/port/security/access-token-verifier.port';
import { issueAuthzAssertion } from './authz-assertion';

async function handleCheckRequest(
  request: IncomingMessage,
  response: ServerResponse,
  verifier: AccessTokenVerifierPort,
  assertionKey: string,
): Promise<void> {
  if (request.url === '/healthz') {
    response.writeHead(200).end();
    return;
  }

  const authorization = request.headers.authorization;
  if (authorization === undefined) {
    // The Vote API keeps its own explicit @Public boundary. Protected routes
    // reject requests without a signed principal assertion.
    response.writeHead(200).end();
    return;
  }
  const bearer = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!bearer) {
    response.writeHead(401).end();
    return;
  }

  try {
    const principal = await verifier.verify(bearer[1]);
    response
      .writeHead(200, {
        [AUTHZ_ASSERTION_HEADER]: issueAuthzAssertion(
          bearer[1],
          principal,
          assertionKey,
        ),
      })
      .end();
  } catch (error) {
    response
      .writeHead(error instanceof InvalidAccessTokenError ? 401 : 503)
      .end();
  }
}

export function createAuthzHttpServer(
  verifier: AccessTokenVerifierPort,
  assertionKey: string,
): Server {
  return createServer((request, response) => {
    void handleCheckRequest(request, response, verifier, assertionKey).catch(
      () => {
        if (!response.headersSent) response.writeHead(503).end();
        else response.destroy();
      },
    );
  });
}
