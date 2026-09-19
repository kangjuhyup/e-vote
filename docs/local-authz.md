# Local Vote authentication boundary

Run `pnpm dev` from the repository root after selecting Node 24 with `nvm use`.
The existing local Auth and database containers still start through Compose.
The Vote development processes and their ports are:

| Process | Address | Purpose |
| --- | --- | --- |
| UI | `localhost:3001` | Auth.js session and BFF |
| Local Auth | `localhost:3002` | `e-vote` OIDC issuer and introspection |
| Envoy | `localhost:3000` | Only API address used by the UI and integration tests |
| Nest API | `localhost:3004` | Upstream reached by Envoy |
| Vote authz | `localhost:3005` | Envoy HTTP `ext_authz` check service |

Envoy runs as a Compose container, using Docker Desktop's
`host.docker.internal` to reach the hot-reloaded Nest and authz host
processes. The local OIDC issuer remains `http://localhost:3002` because
authz runs on the host; it is not the Compose service address. On first run,
`scripts/dev-env.sh` creates a random development-only assertion key in the
Git-ignored `.tmp/vote-authz-assertion-key` file. Both processes read that
file. Do not use this value in production.

The authz service returns an unsigned allow for requests without a bearer
token. Only controllers marked `@Public()` accept those requests; the API
guard rejects every other request without a signed assertion. For a valid
bearer token, authz performs Auth introspection and returns a 15-second
assertion containing the principal and a hash of that token. The API checks
the assertion's HMAC, lifetime, and token binding. Envoy strips any assertion
header supplied by the caller before running `ext_authz`. Invalid tokens and
authz outages fail closed.

`pnpm dev:api` and `pnpm dev:authz` run the two server-side processes
individually. `pnpm dev:docker` starts Envoy and dependencies but not those
host processes. Requests sent directly to Nest's `3004` port cannot reach
protected routes without a valid signed assertion, but use `3000` for local
integration tests so the proxy check is exercised. Unit tests may inject a
test principal verifier without a proxy.

Before changing the Auth boundary, check anonymous and valid-user requests,
invalid and expired tokens, wrong tenant/audience, forged assertion headers,
and Auth outages through `localhost:3000`. The local Envoy config is
`docker/vote-envoy.yaml`; production Istio config must use the same HTTP check
and assertion header contract.
