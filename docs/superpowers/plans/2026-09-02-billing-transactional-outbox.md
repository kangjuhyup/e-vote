# Billing Transactional Outbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist every real BillingOrder transition and its Payment-facing integration event atomically, with a broker-neutral lease/retry dispatcher.

**Architecture:** Billing domain events carry aggregate versions. Application code maps them to immutable integration envelopes and appends them through a port in the same transaction as the BillingOrder/Vote mutation. PostgreSQL stores and leases outbox rows; a transport-neutral dispatcher publishes outside database transactions. No historical side-effect event is backfilled and no publisher is scheduled until a real Payment transport is configured.

**Tech Stack:** NestJS, TypeScript, MikroORM, PostgreSQL, Jest

**Spec:** `skills/transaction-outbox.md`

## Global Constraints

- Preserve `presentation -> application -> domain` and `infrastructure -> application -> domain` dependency direction.
- Keep external I/O outside `@Transactional()` methods.
- Delivery is at least once; retries reuse the persisted message ID.
- Existing Billing rows receive `version = 1`, but receive no synthetic side-effecting events.
- A disabled/unconfigured publisher leaves rows `PENDING`.
- DTO-like application objects use private constructors and `static of()`.

---

### Task 1: Billing Event Versioning

**Files:**
- Modify: `server/src/modules/billing/domain/billing-order.events.ts`
- Modify: `server/src/modules/billing/domain/billing-order.aggregate.ts`
- Modify: `server/src/modules/billing/infrastructure/database/mapper/billing-order.mapper.ts`
- Modify: `server/src/modules/billing/infrastructure/database/repository/command/billing-order-repository.adapter.ts`
- Test: `server/test/domain/billing/billing-order-domain.spec.ts`

**Interfaces:**
- Produces: `BillingOrderAggregate.version`, `domainEvents()`, `clearDomainEvents()` and `BillingOrderDomainEvent.aggregateVersion`.

- [x] Add failing tests proving issue starts at version 1, each real transition increments once, an idempotent no-op emits nothing, and reconstitution emits nothing.
- [x] Replace destructive `pullEvents()` usage with non-destructive `domainEvents()` plus explicit `clearDomainEvents()`.
- [x] Persist/reconstitute `billing_orders.version`.
- [x] Run `pnpm --dir server test -- --runInBand test/domain/billing/billing-order-domain.spec.ts` and expect PASS.

### Task 2: Billing Integration Mapping and Atomic Recording

**Files:**
- Create: `server/src/shared/application/messaging/integration-event-envelope.ts`
- Create: `server/src/shared/application/port/messaging/integration-event-outbox.port.ts`
- Create: `server/src/modules/billing/application/event/billing-order-integration-event.mapper.ts`
- Create: `server/src/modules/billing/application/event/billing-order-outbox.recorder.ts`
- Modify: Billing create, paid, and cancel command handlers.
- Test: `server/test/application/command/handler/billing-command.handlers.spec.ts`
- Test: `server/test/application/event/billing-order-integration-event.mapper.spec.ts`

**Interfaces:**
- Produces: `IntegrationEventEnvelope.of(params)`, `IntegrationEventOutboxPort.append(messages)`, and `BillingOrderOutboxRecorder.record(order)`.
- Consumes: versioned Billing domain events from Task 1.

- [x] Add failing handler tests proving save precedes append, append failure rejects the transaction callback, repeated commands append nothing, and secrets/free-text reasons are absent.
- [x] Map issued, paid, canceled, refund-requested, and refunded events to `billing.*.v1` contracts with stable deduplication keys.
- [x] Record pending events after aggregate save and clear them only after append succeeds.
- [x] Run focused application tests and expect PASS.

### Task 3: PostgreSQL Outbox Persistence

**Files:**
- Create: `server/src/platform/outbox/infrastructure/database/entity/integration-outbox.entities.ts`
- Create: `server/src/platform/outbox/infrastructure/database/repository/integration-outbox-repository.adapter.ts`
- Create: `server/src/shared/application/port/messaging/outbox-message-repository.port.ts`
- Modify: database entity context, registry, and repository provider composition.
- Create: `server/src/platform/database/migration/Migration20260902010000.ts`
- Test: migration, entity registry, and repository adapter specs.

**Interfaces:**
- Produces: atomic `append`, `claimBatch`, `recordPublishAttempt`, `markPublished`, `reschedule`, and `markDead` operations.

- [x] Add failing migration tests for `billing_orders.version`, outbox uniqueness/checks, separate pending/lease indexes, aggregate-order index, and absence of historical event inserts.
- [x] Add failing adapter tests for stable persistence fields, `FOR UPDATE SKIP LOCKED`, database-clock leases, CAS completion, retry, and dead state.
- [x] Register `IntegrationOutboxEntity` and both application port tokens.
- [x] Implement SQL claim/update operations with network-free short transactions.
- [x] Run focused infrastructure tests and expect PASS.

### Task 4: Transport-Neutral Dispatcher

**Files:**
- Create: `server/src/shared/application/port/messaging/integration-event-publisher.port.ts`
- Create: `server/src/shared/application/messaging/integration-event-outbox.dispatcher.ts`
- Create: `server/src/platform/outbox/infrastructure/messaging/not-configured-integration-event-publisher.adapter.ts`
- Modify: `server/src/app.module.ts`
- Test: `server/test/application/messaging/integration-event-outbox.dispatcher.spec.ts`

**Interfaces:**
- Produces: `dispatchBatch({ workerId, batchSize, leaseDurationMs })` for a future scheduler/transport.
- Consumes: claimed outbox messages and `IntegrationEventPublisherPort.publish(message)`.

- [x] Add failing tests for publish success, retry backoff, dead transition, lost lease, and stable message IDs.
- [x] Publish outside repository transactions and update state through lease-token CAS.
- [x] Bind the unconfigured publisher without scheduling dispatch; it must not mark anything published.
- [x] Run focused dispatcher tests and expect PASS.

### Task 5: Verification

**Files:**
- Modify: relevant architecture/module tests and this plan checklist.

- [x] Run all focused Billing/outbox tests.
- [x] Run `pnpm --dir server test -- --runInBand`.
- [x] Run lint for the changed scope, `pnpm --dir server build`, and `git diff --check`.
- [x] Confirm only intended files changed; do not commit, merge, or push without a separate request.
