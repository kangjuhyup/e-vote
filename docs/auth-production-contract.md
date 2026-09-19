# Production Auth contract for Vote

This contract is for the Vote deployment only. Local Compose keeps its separate
public `e-vote` web client and local issuer. The k3s operator reports that the
production tenant and clients below have been created; Vote has not performed
an independent end-to-end login check.

| Item | Required production setting |
| --- | --- |
| Tenant | `e-vote` |
| Issuer | `https://auth.rvkang.app/t/e-vote/oidc` |
| Web client | `e-vote`, confidential `web`, `client_secret_basic`, `authorization_code` and `refresh_token`, PKCE S256 |
| Web scopes | `openid profile email offline_access groups tenant_roles` |
| Web redirects | Exactly `https://vote.rvkang.app/api/auth/callback/e-vote` and `https://vote-admin.rvkang.app/api/auth/callback/e-vote` |
| Web post-logout redirects | Exactly `https://vote.rvkang.app` and `https://vote-admin.rvkang.app` |
| Web allowed resource | Exactly `https://vote-api.rvkang.app` |
| API client | `vote-api`, confidential `service`, `client_secret_basic` for introspection |
| API introspection resources | Exactly `https://vote-api.rvkang.app` |

Do not add `client_credentials` to the API client solely for introspection.
Grant it only after a real machine-to-machine token consumer and its required
scope have been reviewed. The web client secret belongs only in server-side
configuration. Auth.js uses an encrypted JWT cookie session; the Vote access
and refresh tokens stay in it and are not returned in the browser session.
The Vote BFF sends the access token to the API through its Istio sidecar.
The sidecar asks a separate Vote authz workload to introspect the token.
Authz checks active status, exact issuer and audience, expiry, the configured
tenant ID, and subject. A supplied tenant code must match `e-vote`. It returns
a short-lived HMAC-signed principal assertion bound to that access token.
The API verifies the assertion before constructing a user principal, and
retains organization, elector, and vote authorization rules. User identity is
bound to the configured issuer and `sub` in that tenant.

The administrator page is a route of the same Next.js app, not a separate
application. The single `e-vote` client needs both exact callback and logout
URIs above; a separate `e-vote-admin` client is not required by the current
code. Run a UI instance per web hostname with that instance's `AUTH_URL` set
to its own origin. One process with a single `AUTH_URL` serving both hostnames
has not been validated and must not be assumed to preserve host-specific
Auth.js callbacks and cookies.

Deploy two instances of the same UI image with these server-side settings:

| Setting | User UI instance | Administrator UI instance |
| --- | --- | --- |
| `AUTH_URL` | `https://vote.rvkang.app` | `https://vote-admin.rvkang.app` |
| `AUTH_SECRET` | Unique secret for this host | Different unique secret |
| `AUTH_E_VOTE_SECRET` | `e-vote` confidential client secret | Same registered `e-vote` client secret |
| `AUTH_OIDC_ISSUER` | `https://auth.rvkang.app` | Same |
| `AUTH_OIDC_TENANT_CODE` | `e-vote` | Same |
| `AUTH_E_VOTE_RESOURCE` | `https://vote-api.rvkang.app` | Same |
| `VOTE_API_BASE_URL` | Configured Vote API upstream | Same |
| `NEXT_PUBLIC_VOTE_API_MODE` | `live` | `live` |

The Vote authz instance needs `AUTH_OIDC_ISSUER`, `AUTH_OIDC_TENANT_CODE`,
`VOTE_AUTH_TENANT_ID`, `VOTE_AUTH_AUDIENCE`,
`VOTE_AUTH_INTROSPECTION_CLIENT_ID=vote-api`, and the server-only
`VOTE_AUTH_INTROSPECTION_CLIENT_SECRET`. Authz and API also need the same
`VOTE_AUTHZ_ASSERTION_KEY`, at least 32 bytes. The API does not receive the
introspection client secret. Do not print secret values in rollout logs.
Configure the UI's browser-facing participation API URL for the approved Vote
API host separately from the server-to-server `VOTE_API_BASE_URL`.

Set the Vote UI `AUTH_OIDC_ISSUER` to the **origin**
`https://auth.rvkang.app`, not to the tenant issuer path, and set
`AUTH_OIDC_TENANT_CODE=e-vote`. Set `AUTH_URL` to either
`https://vote.rvkang.app` or `https://vote-admin.rvkang.app` for the matching
instance, `AUTH_E_VOTE_RESOURCE=https://vote-api.rvkang.app`, and supply
`AUTH_E_VOTE_SECRET` and `AUTH_SECRET` as server-only secrets. Set
`VOTE_API_BASE_URL` to the actual Vote API upstream address. The UI's provider
ID and callback suffix remain `e-vote`.

Set Vote authz `AUTH_OIDC_ISSUER` and `AUTH_OIDC_TENANT_CODE` to the same
values. Set `VOTE_AUTH_TENANT_ID` to the stable ID of the production `e-vote`
tenant and `VOTE_AUTH_AUDIENCE=https://vote-api.rvkang.app`, the same origin as the
web resource and Auth clients' resource entries. Authz uses `vote-api` and
requires `VOTE_AUTH_INTROSPECTION_CLIENT_SECRET`; it derives the exact tenant
introspection endpoint from the issuer. Production startup rejects missing or
local/example issuer, resource, audience, and web secret settings. The API
rejects a missing or short assertion key at startup and rejects any protected
request without a valid assertion for its bearer token.

The web and API origins above are confirmed. The k3s operator reports the web
client saved with a 600-second access-token lifetime, 1,209,600-second refresh
token lifetime, refresh rotation, and `revoke_grant` on reuse. The API client
has no grant types and an invalid-token introspection request returned HTTP
200 with `active:false`; `client_credentials` returned HTTP 400. These are
configuration checks, not proof that web login and refresh work.

The initial provider instance lacked `offline_access` and `refresh_token` in
discovery because the scope was added after initialization. After the Auth API
Pod was replaced through GitOps, the public discovery endpoint includes both.
Unauthenticated authorization requests using all six scopes, PKCE S256, the
Vote API resource, and each exact web callback returned an Auth interaction
redirect. This verifies metadata and client registration, not a completed
login. Verify login, refresh rotation, logout, and Vote authz introspection with
a real user token after the Vote UI instances are deployed.
Each UI host still needs its own `AUTH_URL`, distinct `AUTH_SECRET`, and runtime
secret injection. The `vote/prd` Doppler project contains the reported Auth
client and API verifier keys and the shared authz assertion key. Workload-specific
injection and Vote deployment manifests still require verification before rollout.
No manifests exist in this repository and runtime injection has not been verified. Keep
`signupPolicy=invite` while provisioning is blocked.

## Deployment prerequisites

The Vote repository provides [ARM64 image build definitions](image-deployment.md)
but no GitOps deployment manifests. Before a production login test, build ARM64 UI
and server images from the same reviewed Vote source revision, publish their
digests, and deploy two UI instances, authz, the API, and the required migration
and worker processes. The deployment owner must provide exact routing and TLS for
the three approved Vote hosts. Do not treat the Auth client registration as a
Vote application deployment.

Set `NEXT_PUBLIC_VOTE_API_MODE=live` and the browser-facing API settings at
the **UI image build** stage; a runtime-only change to `NEXT_PUBLIC_*` is not
sufficient for statically bundled Next.js code. The server-only `AUTH_URL`,
`AUTH_SECRET`, `AUTH_E_VOTE_SECRET`, issuer, resource, and API upstream settings
belong to each UI instance at runtime. Map two distinct session secrets to
`AUTH_SECRET`, one per web host. Authz needs the introspection secret and tenant
ID; authz and API share the assertion key. The API needs database, Redis, and
external-service settings. Run migrations from the deployed API revision before
API traffic is enabled.

Apply Istio `CUSTOM` authorization to the API workload's inbound traffic, not
only to the ingress gateway. Pass the bearer `authorization` header to authz
and allow only `x-vote-authz-assertion` from a successful authz response to
reach the API. Authz permits requests with no bearer so the API's explicit
public-route guard can handle registration and participation-access routes;
protected API routes require a signed assertion. Exclude liveness/readiness
probes from external checks, fail closed on authz failure, and test direct API
access and forged assertion headers before opening ingress.

Database and Redis credentials, TLS trust material, and any worker or storage
dependencies have not been established by the Auth integration. In particular,
the deployed Redis authentication and TLS requirements must be compared with
the Vote adapter before using a shared Redis service. Until these deployment
inputs are present, end-to-end login, refresh, logout, and an API call with a
real user token remain unverified.
As of 2026-09-17, public DNS lookup from the Vote development host did not
resolve any of the three Vote hosts, so no application-host HTTP smoke test
could be completed.

Vote signup and organization management currently call Auth tenant admin APIs
through a shared administrator session. Production blocks these calls before
network access until Auth and Vote agree on a dedicated least-privilege
provisioning account or API. Signup, organization approval, and invitation
acceptance return a service-unavailable response in the meantime. Do not put a
global administrator credential into Vote production configuration as a
workaround. Before enabling provisioning, define the exact tenant user,
group, membership, and role permissions and validate rollback behavior.
