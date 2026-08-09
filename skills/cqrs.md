# Skill: CQRS

## Trigger

- command handlers
- query handlers
- projections/read models
- controller endpoints
- write/read model separation

## Rules

### Write Side

- Commands mutate one aggregate root when possible.
- Invariants are checked from authoritative write-side state.
- Do not decide invariants from projections.
- Persist aggregate changes and emit domain events in one transaction boundary where possible.

### Read Side

- Queries read projection tables/views or optimized read models.
- Queries do not load aggregates to build list/detail responses.
- Admin dashboards can use dedicated read models.

### Controller Mapping

- `GET` routes call query handlers.
- `POST`, `PUT`, `PATCH`, `DELETE` routes call command handlers.

## Do

- Separate write DTOs and read view models.
- Make projectors idempotent.
- Return identifiers or small command results from write handlers.

## Don't

- Update projections inside controllers.
- Return read models from command handlers.
- Use projection data to decide vote eligibility, duplicate participation, or policy invariants.

## Checklist

- [ ] Command uses authoritative state.
- [ ] Query uses read model/projection.
- [ ] Projector is idempotent.
- [ ] Controller follows method-to-command/query mapping.
