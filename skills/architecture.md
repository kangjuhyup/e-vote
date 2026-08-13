# Skill: Backend Architecture

## Trigger

- NestJS module boundaries
- presentation/application/domain/infrastructure layer changes
- ports/adapters
- DTO placement
- moving business logic between layers

## Rules

### Dependency Direction

```text
presentation -> application -> domain
infrastructure -> application -> domain
```

Domain must not depend on NestJS, ORM entities, HTTP exceptions, persistence, cache, storage, blockchain SDKs, or external service clients.

### Layer Responsibilities

- `domain`: pure TypeScript business invariants, value objects, domain events
- `application`: commands, queries, handlers, ports, orchestration
- `infrastructure`: database, cache, files, identity providers, blockchain adapters
- `presentation`: HTTP controllers and request/response DTOs only

### DTO Pattern

Use `private constructor` plus `static of()` for DTOs that are created inside the backend.

```typescript
export class CreateVoteCommand {
  private constructor(
    readonly title: string,
    readonly startsAt: Date,
  ) {}

  static of(params: { title: string; startsAt: Date }): CreateVoteCommand {
    return new CreateVoteCommand(params.title, params.startsAt);
  }
}
```

Request DTOs in `presentation` may use validation decorators. Application/domain DTOs stay framework-free.

### Transactional Decorator Boundary

- The transaction decorator and transaction manager port belong to the application boundary so command handlers can use them without importing infrastructure or a concrete ORM.
- Infrastructure provides the concrete database transaction manager adapter and maps application-level transaction options to ORM-specific options.
- Do not put ORM-specific transaction types, entity managers, query runners, or SDK imports in application/domain code.
- Do not apply transactions in controllers or domain objects. Controllers delegate to handlers; domain objects enforce invariants without opening transactions.
- Apply `@Transactional()` to command-handler methods that perform database mutations or coordinate multiple authoritative repository reads before a write.
- Query handlers should not use transactional decorators unless they explicitly need a consistent database snapshot.
- The default propagation policy is join-existing: join an active transaction, or create one if none exists.
- Use a separate new transaction only for deliberately independent follow-up persistence such as retry state, outbox-like status updates, or audit records that must not join the caller transaction.
- Keep external I/O out of transaction-decorated methods. Identity provider calls, storage presigned URL generation, file binary operations, blockchain calls, network calls, and best-effort cache updates must be outside the database transaction.
- When a command needs external I/O, split the flow: load or validate minimal state, call the external port outside a transaction, then persist the outcome in a short transactional method. Re-read authoritative state inside that transactional method before saving.
- Use stronger isolation only where the invariant depends on absence or counts of concurrent rows. Participation casting, duplicate voting checks, result count updates, and finalization should use at least the documented command-specific isolation level and database unique constraints.

## Do

- Keep controllers thin.
- Define application ports before infrastructure implementations.
- Map persistence entities to domain models explicitly in infrastructure.
- Keep voting secrecy rules in domain/application, not controller branches.
- Keep transaction scopes short and centered on authoritative repository work.

## Don't

- Put business logic in controllers.
- Import infrastructure from domain.
- Return ORM entities across layer boundaries.
- Let blockchain, file storage, or identity provider SDKs leak into application/domain.
- Hold database transactions open while waiting on external services.

## Checklist

- [ ] Domain has no framework/import side effects.
- [ ] Controller delegates to command/query handler.
- [ ] Infrastructure implements application ports.
- [ ] DTOs are in the correct layer.
- [ ] Transaction decorators are applied at application service/command boundaries, not controllers/domain.
- [ ] External I/O is outside database transaction scopes.
