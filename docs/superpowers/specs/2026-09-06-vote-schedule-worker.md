# Vote Schedule Worker Specification

## Goal

Move parent vote lifecycle timing into the standalone worker. Clients configure
the voting window; they do not need to call a status endpoint when the window
starts or ends.

## Lifecycle policy

- `startedAt` and `endedAt` are the configured voting window.
- A vote can be opened only when it is `FINALIZED`, its linked billing order is
  still `PAID`, and `startedAt <= now`.
- A vote is closed when it is `OPEN` and `endedAt <= now`.
- Payment can complete before or after `startedAt`. In both cases the next
  worker iteration opens the vote once both prerequisites are true.
- A delayed worker may open and close an already-expired paid vote in the same
  processing transaction so it does not remain incorrectly open.
- The transition is idempotent. Concurrent worker replicas use PostgreSQL row
  locks with `SKIP LOCKED` so only one replica processes a vote at a time.
- Existing manual open/close endpoints remain for compatibility, but the domain
  applies the same schedule boundary and normal status invariants.

## Compatibility

- Existing `votes.started_at` and `votes.ended_at` columns and response fields
  remain the canonical contract.
- Create/update requests may supply `startedAt` and `endedAt`.
- To avoid breaking existing clients, omitted create values retain the current
  immediate-start behavior (`startedAt = now`, `endedAt = startedAt`). Omitted
  update values preserve the stored window.
- Existing zero-duration windows remain valid; a paid finalized vote with an
  elapsed zero-duration window becomes `CLOSED` in one worker transaction.

## Deployment

- Scheduling runs only in `WorkerModule`, never in the HTTP `AppModule`.
- API HPA replicas therefore do not multiply schedule polling.
- The worker uses `@rvkang/batch-core` continuous polling and performs only
  local transactional database work.
