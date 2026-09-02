# Skill: Adapter, Persistence, Cache

## Trigger

- repository/adapter implementation
- ORM entity changes
- migrations
- Redis/cache strategy
- file storage
- blockchain storage adapter
- identity provider adapter

## Rules

### Persistence

- Database is the source of truth unless a policy explicitly says otherwise.
- ORM entities stay in infrastructure.
- Application/domain use ports and domain models.
- Treat ORM query-option objects as single-call values because MikroORM normalizes and mutates the object it receives. Never pass an exported/shared options object directly to an ORM method.
- Keep shared ORM options as frozen templates only, and pass a fresh object to every ORM call via a factory or object spread. This prevents fields such as `populate`, `logging`, and `schema` from leaking across requests through a mutated shared object.
- Transactions are coordinated in infrastructure/application service boundaries, not controllers.
- Transaction decorator options are application-level concepts; infrastructure adapters translate them to the selected ORM.
- Ordinary write commands should join an existing transaction by default. Use a new transaction only when the follow-up persistence is intentionally independent from the caller.

### Cache

Cache is best-effort:

```text
Write: database first -> cache update/invalidate
Read: cache miss -> database read -> cache update
```

- Do not keep the database transaction open while updating cache. Commit the database change first, then update or invalidate cache as best-effort follow-up work.

Do not cache:

- raw identity verification payloads
- tokens, secrets, one-time codes
- secret vote selections

### File Storage

- `files` stores metadata only.
- Storage keys must be opaque.
- File binary storage stays behind a port.
- File binary operations and presigned URL generation must not run inside a database transaction.
- Persist file metadata in a short transaction, then call storage ports outside the transaction, or call storage first and persist only the opaque key/result in a follow-up transaction according to the command's consistency needs.

### Identity Providers

- Do not call identity provider ports inside a database transaction.
- Persist identity verification requests/results in short transactions.
- If provider verification succeeds, re-read the elector and verification state in the transactional persistence step before marking identity as verified.

### Blockchain Storage

- Blockchain adapters store result hash or approved result payload only.
- Persist transaction hash, network, block number, and error state in database.
- Retry by appending a new storage record or updating a pending record according to the command design.
- Create or update a pending result storage record in a database transaction, commit, then call the blockchain adapter outside that transaction.
- Record blockchain success or failure in a separate short transaction. Use an independent transaction only when the result update must survive caller rollback.

## Do

- Map persistence rows to domain/read models explicitly.
- Keep cache failures non-fatal unless the feature explicitly requires cache.
- Keep file and blockchain SDKs in infrastructure.
- Re-read authoritative state inside the transaction that persists external I/O outcomes.

## Don't

- Expose ORM entities from handlers.
- Cache secret ballot selections.
- Put storage SDK calls in controllers/domain.
- Put identity provider, file storage, blockchain, or cache network calls inside a database transaction.

## Checklist

- [ ] ORM entities are infrastructure-only.
- [ ] Shared ORM option templates are frozen, and each ORM call receives a fresh options object.
- [ ] Database write happens before cache update.
- [ ] File metadata and binary storage are separated.
- [ ] Blockchain result storage has retry/error handling.
- [ ] External I/O calls are split from transaction-decorated persistence methods.
