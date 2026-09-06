# API and Outbox Worker Process Separation Implementation Plan

> **For agentic workers:** Execute this plan in the current server worktree. Do not commit, merge, push, or modify the UI worktree without an explicit follow-up instruction.

**Goal:** Run the HTTP API and payment outbox poller as independent processes so API replicas can be managed by an HPA without multiplying workers.

**Architecture:** `AppModule` remains the HTTP composition root and contains no polling lifecycle provider. A controller-free `WorkerModule` owns the database-backed payment dispatcher and `MockPaymentOutboxWorker`, and `worker.ts` starts it through `NestFactory.createApplicationContext`. Local development launches API and worker separately; production uses independent container commands.

**Tech Stack:** NestJS 11, MikroORM 7, `@rvkang/batch-core`, Jest, pnpm.

**Spec:** `docs/api/billing.md`

## Global Constraints

- Preserve existing server changes and do not touch the UI worktree.
- Do not stop or restart running UI, server, or authentication processes.
- Keep outbox delivery at-least-once and retain database lease/claim semantics.
- Keep mock payment disabled in production.
- Do not commit, push, open a PR, or merge without a separate request.

---

### Task 1: Lock the process boundary with tests

**Files:**

- Modify: `server/test/app.module.spec.ts`
- Create: `server/test/worker.module.spec.ts`
- Create: `server/test/worker.spec.ts`
- Modify: `server/test/collection-request-context.database.e2e-spec.ts`

- [x] Assert that `AppModule` does not register `MockPaymentOutboxWorker`.
- [x] Assert that `WorkerModule` has no controllers and does register the worker.
- [x] Assert that the worker entrypoint creates an application context and enables shutdown hooks.
- [x] Make the PostgreSQL lifecycle E2E opt into both API and worker modules explicitly.

### Task 2: Add the worker-only composition root and entrypoint

**Files:**

- Modify: `server/src/app.module.ts`
- Create: `server/src/worker.module.ts`
- Create: `server/src/worker.ts`

- [x] Remove polling and payment publication providers from the API root.
- [x] Register database repositories, billing transition handlers, publisher, dispatcher, and worker in `WorkerModule` only.
- [x] Start the worker with `NestFactory.createApplicationContext` and graceful SIGTERM/SIGINT shutdown hooks.

### Task 3: Expose independent commands and local orchestration

**Files:**

- Modify: `server/package.json`
- Modify: `package.json`
- Modify: `scripts/dev.sh`

- [x] Add independent development and production worker commands.
- [x] Keep API commands API-only.
- [x] Start API, worker, and UI as separate child processes in `pnpm dev` and clean up only those children.

### Task 4: Document deployment and scaling contract

**Files:**

- Modify: `README.md`
- Modify: `docs/api/billing.md`

- [x] Document independent API and worker commands.
- [x] State that an HPA targets only API replicas while worker replicas are managed separately.
- [x] Document that multiple worker replicas remain safe through `FOR UPDATE SKIP LOCKED` leases, without claiming exactly-once delivery.

### Task 5: Verify

- [x] Run focused module/bootstrap/worker tests.
- [x] Run the PostgreSQL billing lifecycle E2E.
- [x] Run all server tests, lint, build, and `git diff --check` under Node 24.
