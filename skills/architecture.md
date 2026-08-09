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

## Do

- Keep controllers thin.
- Define application ports before infrastructure implementations.
- Map persistence entities to domain models explicitly in infrastructure.
- Keep voting secrecy rules in domain/application, not controller branches.

## Don't

- Put business logic in controllers.
- Import infrastructure from domain.
- Return ORM entities across layer boundaries.
- Let blockchain, file storage, or identity provider SDKs leak into application/domain.

## Checklist

- [ ] Domain has no framework/import side effects.
- [ ] Controller delegates to command/query handler.
- [ ] Infrastructure implements application ports.
- [ ] DTOs are in the correct layer.
