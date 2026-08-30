# SMS Dispatch History API Implementation Plan

> Repository policy: execute this plan directly in the isolated `vote-sms-notifications` worktree. Do not invoke the Superpowers executing-plans workflow unless the user explicitly requests it.

**Goal:** Persist per-recipient SMS delivery outcomes and expose vote-scoped summary and detail APIs.

**Architecture:** The SMS gateway returns recipient delivery outcomes without exposing phone numbers. Send command handlers validate the authoritative vote/session state, perform external SMS I/O outside a transaction, then persist an immutable dispatch aggregate through a shared command port. GET handlers use a dedicated read repository and projection views rather than rebuilding aggregates.

**Tech Stack:** NestJS 11, TypeScript, MikroORM 7, PostgreSQL, Jest, Swagger.

---

### Task 1: Define the delivery result and audit model

**Files:**
- Modify: `server/src/shared/application/port/gateway/sms-sender.port.ts`
- Create: `server/src/shared/domain/sms/sms-dispatch.aggregate.ts`
- Create: `server/src/shared/domain/sms/type/sms-delivery-status.type.ts`
- Create: `server/src/shared/application/port/persistence/sms-dispatch-repository.port.ts`
- Test: `server/test/domain/sms/sms-dispatch.spec.ts`

- [x] Replace the aggregate recipient count gateway result with per-recipient outcomes.
- [x] Enforce immutable audit invariants: unique electors, success without a reason, failure with a reason, and derived counts.
- [x] Keep phone numbers and message bodies out of the audit model.

### Task 2: Persist outcomes after external delivery

**Files:**
- Modify: `server/src/modules/vote/application/command/handler/send-vote-sms.handler.ts`
- Modify: `server/src/modules/field-voting/application/command/handler/send-field-voting-session-sms.handler.ts`
- Modify: send result DTOs
- Test: `server/test/application/command/handler/send-sms.handlers.spec.ts`

- [x] Persist the completed dispatch after the gateway call.
- [x] Return dispatch ID, sent time, recipient, success, and failure counts.
- [x] Verify no database transaction wraps the external gateway call.

### Task 3: Add database entities, repositories, and migration

**Files:**
- Create: `server/src/shared/infrastructure/database/entity/sms-dispatch.entities.ts`
- Create: `server/src/modules/vote/infrastructure/database/repository/command/sms-dispatch-repository.adapter.ts`
- Create: `server/src/modules/vote/infrastructure/database/repository/query/sms-dispatch-read-repository.adapter.ts`
- Create: `server/src/platform/database/migration/Migration20260830020000.ts`
- Modify: database entity registry and repository providers
- Test: entity, provider, repository, and migration specs

- [x] Store dispatch summaries and per-recipient deliveries in normalized tables.
- [x] Add vote-scoped indexes, count checks, delivery status/reason checks, and immutable insert-only persistence.
- [x] Map ORM rows explicitly to domain records and read views.

### Task 4: Add CQRS summary and detail APIs

**Files:**
- Create: query DTOs, views, handlers, read repository port
- Create: `server/src/modules/vote/presentation/vote-sms/vote-sms-read.controller.ts`
- Create: request/response DTOs under `vote-sms/dto`
- Modify: `server/src/app.module.ts`
- Test: query handler and route specs

- [x] Add paged summary query ordered by sent time descending.
- [x] Add vote-scoped detail query with recipient name, business identifier, status, and failure reason.
- [x] Map missing or cross-vote dispatch IDs to 404.
- [x] Mask recipient names in presentation and never return phone numbers.

### Task 5: Document and verify

**Files:**
- Modify: `docs/api/sms-notifications.md`
- Modify: `README.md` if needed

- [x] Document gateway outcome contract and both read APIs.
- [x] Run focused tests, full tests, build, lint, and diff checks.
- [x] Confirm no vendor-backed SMS provider adapter was added.
