# Skill: Transactional Outbox

## Core Contract

Use an outbox when committed database state must reach another process. Persist the aggregate and integration messages in one local transaction; perform network I/O only after commit.

Delivery is **at least once**. Reuse one message ID across retries and make consumers idempotent. Never claim exactly-once network delivery.

| Layer | Responsibility |
|---|---|
| Domain | Enforce transitions and raise past-tense events; no JSON, broker, or ORM. |
| Application | Map domain events to versioned integration envelopes; coordinate save plus append through ports. |
| Infrastructure | Persist, lease, publish, retry, and record outcomes. |
| Presentation | Start commands only; never publish. |

## Atomic Write

```typescript
@Transactional()
async execute(command: Command): Promise<Result> {
  const order = await this.orders.getForUpdate(command.orderId);
  order.apply(command);
  const events = order.domainEvents();
  await this.orders.save(order);
  await this.outbox.append(events.map(mapToIntegrationEvent));
  return Result.of(order);
}
```

Both writes join the same transaction and roll back together. Never call Payment, HTTP, brokers, webhooks, storage, or cache inside it. “Commit, then publish” has a crash-loss window.

Read events non-destructively until append succeeds. Command-local aggregates may clear after append because retries reload them; escaping aggregates require an after-commit Unit of Work hook. Idempotent no-op transitions emit nothing.

Use a deterministic unique key `(source, aggregateType, aggregateId, aggregateVersion, eventType, eventPosition)`. Include `eventPosition` when one transition emits multiple same-type events.

Persist a stable ID; source/type/schema version; aggregate identity/version/position; immutable minimal JSON payload; occurrence/creation time; correlation/causation metadata; status/availability/attempts; lease owner/token/expiry; published time; bounded sanitized error. Integration payloads are explicit contracts, never serialized aggregates or unnecessary identity/secrets.

## Dispatcher

1. In a short `READ COMMITTED` transaction, claim due `PENDING` and expired `PROCESSING` rows using database time and `FOR UPDATE SKIP LOCKED`; lease them, then commit.
2. Publish outside transactions with the persisted ID and aggregate routing key.
3. Mark `PUBLISHED` in a new transaction only by message ID plus lease-token compare-and-set.
4. Retry with jittered exponential backoff. After a bounded limit, retain as `DEAD`, alert, and replay with the same ID.

Older non-published messages block later messages for that aggregate, not others. A `DEAD` predecessor may be skipped only with destination evidence, compatibility/compensation review, named approval, reason, timestamp, and immutable audit record.

Use separate partial indexes for `PENDING(availableAt, createdAt, id)`, `PROCESSING(lockedUntil, id)`, and non-published aggregate ordering. Track backlog, oldest age, latency, claim/publish attempts, dead rows, and lease recovery. A disabled publisher leaves rows pending. Apply an explicit published-row retention policy.

## Consumer Inbox

In one local transaction, `INSERT ... ON CONFLICT DO NOTHING` an inbox key `(consumerName, messageId, payloadHash)`, apply the business transition, mark processed, and commit before acknowledgement. Matching completed duplicates are acknowledged without work; the same ID with another hash is rejected and alerted.

Hash canonical JSON or authenticated raw bytes. Also enforce a business key such as one Payment order per `billingOrderId`; inbox uniqueness cannot stop different IDs for the same operation. Authenticate the producer, bound message size, validate schemas fail-closed, and retry aggregate-version gaps. Provider calls require Payment's own durable job/outbox and stable provider idempotency key.

## Historical Cutover

Never backfill side-effecting events from every existing row. Classify possible effects, including paid, canceled, `REFUND_PENDING`, refunded, provider-ledger, refund, notification, and idempotency state.

Use a deployment watermark, non-side-effecting reconciliation event, or narrow reviewed state allow-list. Before any side-effecting backfill, compare destination state and every relevant external effect, including provider ledger, refunds, notifications, and idempotency records. Backfills need stable IDs, idempotent inserts, dry-run counts by state, and tests proving unsafe history cannot cause charges/refunds.

A watermark is safe only when every crossing writer is proven outbox-capable. During rolling deployment, keep publishing disabled until old writers and in-flight mutations drain, or enforce a database barrier. Mixed old/new writers cannot remain after publishing starts. Treat every pre-watermark message—including genuine new-instance rows—as historical and state-review it.

## Required Tests

- atomic rollback and racing-command deduplication;
- crash-after-publish duplicate, inbox duplicate, and business-key duplicate;
- concurrent claims, lease recovery, retry/dead/replay, and per-aggregate ordering;
- payload mismatch, authentication/schema failure, and version gap;
- safe cutover and historical-state exclusion.

## Red Flags

| Shortcut | Correction |
|---|---|
| External call in `@Transactional()` | Append, then publish after commit. |
| New ID per retry | Reuse the outbox ID. |
| Mark before acknowledgement | Use acknowledgement plus lease CAS. |
| Inbox without business uniqueness | Enforce both. |
| One pending/lease index | Index due work and expired leases separately. |
| Backfill all history or auto-skip `DEAD` | Reconcile state and require audited approval. |
