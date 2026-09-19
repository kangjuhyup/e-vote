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
the same source revision for local inspection only. A local build from an
uncommitted worktree receives the `-dirty` suffix. `PUSH_IMAGES=true` is
rejected; image publication is reserved for the merged release PR workflow.

## PR-based release

Add a changeset to each PR that changes deployable Vote behavior with
`pnpm changeset`. Server and UI versions move together. After a feature PR
is merged into `main`, [Prepare release PR](../.github/workflows/release-pr.yml)
creates or updates `changeset-release/main`. Review and merge that PR after
the Server and UI CI checks pass. Only the merged release PR triggers
[Publish Vote images](../.github/workflows/publish.yml), which reruns lint,
tests, and builds before publishing Linux ARM64 images to GHCR:

```text
ghcr.io/<owner>/<repo>/server:v<version>
ghcr.io/<owner>/<repo>/ui:v<version>
```

The publish workflow also attaches `sha-<merge-commit>` tags. Record the
resulting registry digests and use those immutable digests in deployment
declarations. No npm packages are published. Auth remains an external service;
these workflows do not build or publish Auth images.

Repository setup is required before the workflow can operate:

1. Configure `RELEASE_PR_TOKEN` as a fine-grained personal access token with
   repository Contents and Pull requests write permissions. It lets
   Changesets-created PRs run CI without manual workflow approval. Allow
   Actions to create pull requests in repository settings.
2. Protect `main`: require pull requests and the Server and UI CI checks,
   and restrict bypass/direct pushes. Grant GitHub Actions permission to write
   packages to GHCR.
3. Keep the release branch in the same repository. Do not add a tag-push or
   manual publish workflow; image publication must follow its PR merge.

This repository has no GitOps manifests or rollout target. GHCR publication is
the current automation boundary; migration, runtime secrets, routing, and
workload rollout belong to the deployment repository. The local build script
does not update GitOps or deploy workloads.

The UI build fixes these non-secret browser values in the image:

| Variable                                 | Image value                   |
| ---------------------------------------- | ----------------------------- |
| `NEXT_PUBLIC_VOTE_API_MODE`              | `live`                        |
| `NEXT_PUBLIC_VOTE_API_BASE_URL`          | `/api/vote-server`            |
| `NEXT_PUBLIC_PARTICIPATION_API_BASE_URL` | `https://vote-api.rvkang.app` |

Changing `NEXT_PUBLIC_*` requires another image build. Do not pass Auth,
database, Redis, storage, or session credentials as build arguments. Inject
them at runtime per workload. The same UI digest serves
`vote.rvkang.app` and `vote-admin.rvkang.app` in separate instances with
their own `AUTH_URL` and `AUTH_SECRET`; see the
[production Auth contract](auth-production-contract.md) for exact values.

Use the server digest for four distinct workloads:

| Workload          | Container command                      | Order / probe                                                               |
| ----------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| Migration Job     | `node dist/src/migrate.js`             | Complete successfully before API/worker rollout                             |
| Authz Deployment  | `node dist/src/authz.js`               | `/healthz` on port 3005; use as the API sidecar's HTTP `ext_authz` provider |
| API Deployment    | image default: `node dist/src/main.js` | `/liveness` and `/readiness` on port 3000                                   |
| Worker Deployment | `node dist/src/worker.js`              | Separate replica policy; no HTTP probe                                      |

The authz workload alone receives the `vote-api` introspection secret. Authz
and API receive the same `VOTE_AUTHZ_ASSERTION_KEY` (at least 32 bytes); the API
does not need the introspection client secret. Configure Istio's `CUSTOM`
authorization policy for the API workload with `authorization` in the check
request and `x-vote-authz-assertion` allowed upstream only after a successful check.
The API rejects unsigned or mismatched assertions even if its port is reached
directly. Keep the authz workload private and fail closed when it is unavailable.

The migration entrypoint uses compiled MikroORM migrations from the same
image revision and closes its database connection when done. The UI image
listens on port 3001. Configure the two UI hosts, the API host, TLS, runtime
secrets, DB/Redis connectivity, and any storage dependency in the deployment
repository; this Vote repository does not contain GitOps manifests. Check
login, token refresh, logout, authz introspection, and participation only after
the workloads and public DNS are available.
