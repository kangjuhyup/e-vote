# Vote container images

Build from the repository root. `Dockerfile.ui` and `Dockerfile.server` use
Node 24.20.0 and pnpm 9.15.9, the versions pinned by `.nvmrc` and
`package.json`. Both images target Linux ARM64. The UI uses Next.js standalone
output; the server image contains production dependencies and compiled code,
without the application build tools or source tree. Both runtime stages use the
unprivileged `node` user.

Set the approved registry/repository prefix before building:

```sh
IMAGE_PREFIX=<registry>/<namespace>/vote scripts/build-images.sh
```

The script builds `<prefix>/ui:<commit>` and `<prefix>/server:<commit>` from
the same source revision. A local build from an uncommitted worktree receives
the `-dirty` suffix. To publish after committing and authenticating to the
registry, run `PUSH_IMAGES=true IMAGE_PREFIX=... scripts/build-images.sh`.
Publication refuses a dirty worktree. Record both resulting registry digests
and use the digests, rather than mutable tags, in deployment declarations.
The script does not update GitOps or deploy workloads.

The UI build fixes these non-secret browser values in the image:

| Variable | Image value |
| --- | --- |
| `NEXT_PUBLIC_VOTE_API_MODE` | `live` |
| `NEXT_PUBLIC_VOTE_API_BASE_URL` | `/api/vote-server` |
| `NEXT_PUBLIC_PARTICIPATION_API_BASE_URL` | `https://vote-api.rvkang.app` |

Changing `NEXT_PUBLIC_*` requires another image build. Do not pass Auth,
database, Redis, storage, or session credentials as build arguments. Inject
them at runtime per workload. The same UI digest serves
`vote.rvkang.app` and `vote-admin.rvkang.app` in separate instances with
their own `AUTH_URL` and `AUTH_SECRET`; see the
[production Auth contract](auth-production-contract.md) for exact values.

Use the server digest for three distinct workloads:

| Workload | Container command | Order / probe |
| --- | --- | --- |
| Migration Job | `node dist/src/migrate.js` | Complete successfully before API/worker rollout |
| API Deployment | image default: `node dist/src/main.js` | `/liveness` and `/readiness` on port 3000 |
| Worker Deployment | `node dist/src/worker.js` | Separate replica policy; no HTTP probe |

The migration entrypoint uses compiled MikroORM migrations from the same
image revision and closes its database connection when done. The UI image
listens on port 3001. Configure the two UI hosts, the API host, TLS, runtime
secrets, DB/Redis connectivity, and any storage dependency in the deployment
repository; this Vote repository does not contain GitOps manifests. Check
login, token refresh, logout, API introspection, and participation only after
the workloads and public DNS are available.
