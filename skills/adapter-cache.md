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
- Transactions are coordinated in infrastructure/application service boundaries, not controllers.

### Cache

Cache is best-effort:

```text
Write: database first -> cache update/invalidate
Read: cache miss -> database read -> cache update
```

Do not cache:

- raw identity verification payloads
- tokens, secrets, one-time codes
- secret vote selections

### File Storage

- `files` stores metadata only.
- Storage keys must be opaque.
- File binary storage stays behind a port.

### Blockchain Storage

- Blockchain adapters store result hash or approved result payload only.
- Persist transaction hash, network, block number, and error state in database.
- Retry by appending a new storage record or updating a pending record according to the command design.

## Do

- Map persistence rows to domain/read models explicitly.
- Keep cache failures non-fatal unless the feature explicitly requires cache.
- Keep file and blockchain SDKs in infrastructure.

## Don't

- Expose ORM entities from handlers.
- Cache secret ballot selections.
- Put storage SDK calls in controllers/domain.

## Checklist

- [ ] ORM entities are infrastructure-only.
- [ ] Database write happens before cache update.
- [ ] File metadata and binary storage are separated.
- [ ] Blockchain result storage has retry/error handling.
