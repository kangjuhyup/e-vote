# Vote Billing Finalization and Cancellation Implementation Plan

> **For Codex:** Execute this plan in the current session while preserving the module dependency direction documented in `vote-architecture`.

**Goal:** Treat vote-usage order creation as vote finalization, lock the finalized vote setup, and support cancellation for seven days before voting opens.

**Architecture:** Billing owns price, order, cancellation-window snapshot, and refund lifecycle. Vote owns vote lifecycle and setup locking. The two modules collaborate through shared application capability ports, and the application handlers coordinate both aggregates in a serializable database transaction. No payment provider call is added; paid cancellations remain `REFUND_PENDING` for a future payment service.

**Tech Stack:** NestJS, TypeScript, MikroORM/PostgreSQL, Jest

---

### Task 1: Persist vote finalization and billing cancellation snapshots

- [x] Add `billingOrderId` and `finalizedAt` to `VoteAggregate`, persistence mapping, entity schema, and migration.
- [x] Add cancellation-window days, cancelable deadline, cancellation metadata, and refund-request timestamp to `BillingOrderAggregate` and persistence.
- [x] Extend billing states with `CANCELED` and `REFUND_PENDING`, and add cancellation/refund-request domain events.
- [x] Add a seven-day standard vote-usage cancellation policy value object.

### Task 2: Coordinate order creation, vote opening, and cancellation

- [x] Add shared vote setup lifecycle and vote-usage entitlement capability ports.
- [x] Finalize the vote atomically when a billing order is first created.
- [x] Require a paid billing order before a finalized vote can open.
- [x] Add an authenticated cancel command/handler that checks commission membership, deadline, and vote state before canceling.
- [x] Keep paid cancellations in `REFUND_PENDING`; only a later payment integration may mark them `REFUNDED`.

### Task 3: Lock finalized setup

- [x] Reject vote settings and electoral-roll snapshot changes after finalization.
- [x] Reject manual elector create/update/block operations after finalization.
- [x] Prevent the generic vote-status endpoint from bypassing the billing cancellation workflow.

### Task 4: Expose and document the API

- [x] Add `POST /billing/vote-usage-orders/:billingOrderId/cancellation` with `@User() user: UserPrincipal`.
- [x] Return cancellation policy and lifecycle timestamps from create/get/cancel responses.
- [x] Update billing API documentation with state transitions, eligibility rules, errors, and examples.

### Task 5: Verify behavior and migration safety

- [x] Cover domain state transitions, deadline boundaries, idempotency, and invalid transitions.
- [x] Cover application authorization, transaction orchestration, setup locks, and paid-open entitlement.
- [x] Cover controller request/response mapping and migration/entity registration.
- [x] Run focused tests, architecture tests, build, and the full Jest suite with the repository Node version selected by `nvm use`.
